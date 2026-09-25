import { consumer } from "../config/kafka.js";
import { redisClient } from "../config/redis.js";
import { deleteVideoFromIndex, indexCategory, indexVideo, VideoIndexData, CategoryIndexData } from "../services/indexing.service.js";

export const startSearchConsumer = async (): Promise<void> => {
    await consumer.connect();
    await consumer.subscribe({ topics: ["video-events", "category-events"], fromBeginning: false });

    console.log("📥 Search Kafka Consumer Running...");

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            if (!message.value) return;
            const event = JSON.parse(message.value.toString());
            const eventType: string = event.type || event.event;
            const eventData = event.data || event;

            console.log(`Received event: ${eventType} from topic: ${topic}`);

            try {
                switch (eventType) {
                    case "VIDEO_UPLOADED":
                    case "VIDEO_UPDATED":
                    case "TRANSCODING_FINISHED":
                        await indexVideo(eventData as VideoIndexData);
                        await clearSearchCache();
                        break;

                    case "VIDEO_DELETED":
                        await deleteVideoFromIndex(eventData.videoId);
                        await clearSearchCache();
                        break;

                    case "CATEGORY_CREATED":
                    case "CATEGORY_UPDATED":
                        await indexCategory(eventData as CategoryIndexData);
                        break;

                    default:
                        console.log(`Unhandled event type: ${eventType}`);
                }
            } catch (error) {
                console.error("❌ Error processing Kafka event:", error);
            }
        }
    });
};

const clearSearchCache = async (): Promise<void> => {
    try {
        if (redisClient && redisClient.isOpen) {
            const keys = await redisClient.keys("search:*");
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log("✅ Search cache cleared for new data sync.");
            }
        }
    } catch (error) {
        console.error("Redis Cache Clear Error:", error);
    }
};
