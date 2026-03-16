import { esClient } from "../config/elasticsearch.js";
import { CATEGORY_INDEX, VIDEO_INDEX } from "../constants/indexNames.js";

export const initializeIndices = async () => {
  try {
    // --- 1. Initialize Video Index ---
    const videoExists = await esClient.indices.exists({ index: VIDEO_INDEX });
    if (!videoExists) {
      await esClient.indices.create({
        index: VIDEO_INDEX,
        body: {
          mappings: {
            properties: {
              title: { type: "text" },
              description: { type: "text" },
              tags: { type: "keyword" }, // Keyword = fast filtering
              category: { type: "keyword" }, // Keyword = exact match
              views: { type: "integer" },
              createdAt: { type: "date" },
            },
          },
        },
      });
      console.log(`INDEX CREATED: ${VIDEO_INDEX}`);
    }

    // --- 2. Initialize Category Index ---
    const catExists = await esClient.indices.exists({index: CATEGORY_INDEX});
    if(!catExists){
        await esClient.indices.create({
            index: CATEGORY_INDEX,
            body: {
                mappings: {
                    properties: {
                        name: { type: "text" },
                        slug: { type: "keyword" },
                        active: { type: "bolean" }
                    }
                }
            }

        });
        console.log(`INDEX CREATED: ${CATEGORY_INDEX}`);
    }
  } catch (error) {
    console.error("❌ Failed to initialize index:", error);
  }
};
