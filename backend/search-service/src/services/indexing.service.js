import {esClient} from "../config/elasticsearch.js";
import { VIDEO_INDEX } from "../constants/indexNames.js";
import { CATEGORY_INDEX } from "../constants/indexNames.js";



export const indexVideo = async (videoData) =>{
    try {
        await esClient.index({
            index: VIDEO_INDEX,
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

export const indexCategory = async (categoryData) => {
    await esClient.index({
        index: CATEGORY_INDEX,
        id: categoryData.id,
        document: {
            name: categoryData.name,
            slug: categoryData.slug,
            thumbnailUrl: categoryData.thumbnailUrl,
            active: true
        }
    });
}

export const deleteVideoFromIndex = async (videoId) =>{
    try {
        await esClient.delete({
            index: VIDEO_INDEX,
            id: videoId,
        });
        console.log(`Video ${videoId} removed from search index.`);
    } catch (error) {
        console.error(" Failed to delete video index:", error.message);
    }
};