import {esClient} from "../config/elasticsearch.js";

const INDEX_NAME = 'videos';

export const indexVideo = async (videoData) =>{
    try {
        await esClient.index({
            index: INDEX_NAME,
            id: videoData.videoId, // Use videoId as the document ID
            document: {
                title: videoData.title,
                description: videoData.description,
                tags: videoData.tags,
                thumbnailUrl: videoData.thumbnailUrl,
                category: videoData.category,
                views: videoData.views || 0,
                createdAt: videoData.createdAt || new Date(),
            }
        });
        console.log(`Video ${videoData.videoId} indexed in Elasticsearch`);
    } catch (error) {
        console.error("failed to index video:", error);
    }

};

export const deleteVideoFromIndex = async (videoId) =>{
    try {
        await esClient.delete({
            index: INDEX_NAME,
            id: videoId,
        });
        console.log(`Video ${videoId} removed from search index.`);
    } catch (error) {
        console.error(" Failed to delete video index:", error.message);
    }
};