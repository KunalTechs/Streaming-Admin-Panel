import { consumer } from "../config/kafka";
import { redisClient } from "../config/redis";
import { deleteVideoFromIndex, indexCategory, indexVideo } from "../services/indexing.service";

export const startSearchConsumer = async () => {
    await consumer.connect();

    // Subscribe to the topics coming from Video and Category services
    await consumer.subscribe({ topics: ['video-events', 'category-events'], fromBeginning: false});

    console.log(' Search Kafka Consumer Running...');

    await consumer.run({
        eachMessage: async ({topic, partition, message}) => {
            const event =JSON.parse(message.value.toString());
            console.log(`Received event: ${event.type} from topic: ${topic}`);

            try {
                switch (event.type) {
                    case  'VIDEO_UPLOADED':
                    case  'VIDEO_UPDATED':
                        await indexVideo(event.data);
                        // IMPORTANT: Clear the cache for this search query or general home search
                        // This ensures the new video shows up immediately
                        await clearSearchCache();
                        break;

                    case 'VIDEO_DELETED':
                        await deleteVideoFromIndex(event.data.videoId);
                        await clearSearchCache();
                        break;

                    case 'CATEGORY_CREATED':
                        await indexCategory(event.data);
                        break;

                        default:
                            console.log(`Unhandled evnt type: ${event.type}`);
                }
            } catch (error) {
                console.error(`❌ Error processing Kafka event:`, error);
            }
        }
    });
};


// Helper function to clear search-related cache in Redis
const clearSearchCache = async () => {
    try {
        // Find all keys starting with 'search:' and delete them
        const keys = await redisClient.keys('search:*');
        if(keys.length>0){
            await redisClient.del(keys);
            console.log('Search cache cleared for new data sync.')
        }
    } catch (error) {
        console.error('Redis Cache Clear Error:', error);
    }
}