import { esClient } from "../config/elasticsearch.js";
import { VIDEO_INDEX, CATEGORY_INDEX } from "../constants/indexNames.js";

export interface VideoIndexData {
    videoId: string;
    title: string;
    description?: string;
    tags?: string[];
    thumbnailUrl?: string;
    category?: string;
    views?: number;
    createdAt?: Date | string;
}

export interface CategoryIndexData {
    id: string;
    name: string;
    slug?: string;
    thumbnailUrl?: string;
}

export const indexVideo = async (videoData: VideoIndexData): Promise<void> => {
    try {
        await esClient.index({
            index: VIDEO_INDEX,
            id: videoData.videoId,
            document: {
                title: videoData.title,
                description: videoData.description || "",
                tags: videoData.tags || [],
                thumbnailUrl: videoData.thumbnailUrl || null,
                category: videoData.category || null,
                views: videoData.views || 0,
                createdAt: videoData.createdAt || new Date(),
            }
        });
        console.log(`✅ Video ${videoData.videoId} indexed in Elasticsearch`);
    } catch (error) {
        console.error("❌ Failed to index video:", error);
    }
};

export const indexCategory = async (categoryData: CategoryIndexData): Promise<void> => {
    try {
        await esClient.index({
            index: CATEGORY_INDEX,
            id: categoryData.id,
            document: {
                name: categoryData.name,
                slug: categoryData.slug || "",
                thumbnailUrl: categoryData.thumbnailUrl || null,
                active: true
            }
        });
        console.log(`✅ Category ${categoryData.id} indexed in Elasticsearch`);
    } catch (error) {
        console.error("❌ Failed to index category:", error);
    }
};

export const deleteVideoFromIndex = async (videoId: string): Promise<void> => {
    try {
        await esClient.delete({
            index: VIDEO_INDEX,
            id: videoId,
        });
        console.log(`🗑️ Video ${videoId} removed from search index.`);
    } catch (error) {
        const err = error as Error;
        console.error("❌ Failed to delete video index:", err.message);
    }
};
