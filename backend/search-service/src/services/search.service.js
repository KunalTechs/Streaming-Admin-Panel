import { esClient } from "../config/elasticsearch.js";
import { VIDEO_INDEX } from "../constants/indexNames.js";

export const executeSearch = async (searchTerm) => {
  const result = await esClient.search({
    index: VIDEO_INDEX,

      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: searchTerm,
                fields: ["title^3", "description", "tags"], //// Title is 3x more important
                fuzziness: "AUTO", // Handles typos!
                operator: "and",
              },
            },
          ],
          // Example: Filter by category if the user selects one
         filter: filters.category ? [{ term: { "category.keyword": filters.category } }] : [],
        },
      },
      // Highlight the words that matched
      highlight: {
        fields: {
          title: {},
          description: {},
        },
      },
  });

  // Elasticsearch returns a deep object, we simplify it for the frontend
  return result.hits.hits.map((hit) => ({
    id: hit._id,
    ...hit._source,
    score: hit._score, //Search relevance score 
    highlights: hit.highlight,
  }));
};
