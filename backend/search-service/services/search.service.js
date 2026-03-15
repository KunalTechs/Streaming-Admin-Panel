import { esClient } from "../config/elasticsearch.js";

export const executeSearch = async (searchTerm) => {
    const result = await esClient.search({
        index: 'videos',
        query: {
            multi_match :{
                query: searchTerm,
                fields: ['title^3', 'description', 'tags'], //// Title is 3x more important
                fuzziness: 'AUTO', // Handles typos!
            }
        }
    });

    // Elasticsearch returns a deep object, we simplify it for the frontend
    return result.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source,
        score: hit._score //Search relevance score
    }));
};