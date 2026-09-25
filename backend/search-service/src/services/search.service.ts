import { esClient } from "../config/elasticsearch.js";
import { VIDEO_INDEX } from "../constants/indexNames.js";

export interface SearchFilters {
    category?: string;
}

export interface SearchResultItem {
    id: string;
    score?: number | null;
    highlights?: Record<string, string[]>;
    [key: string]: unknown;
}

export const executeSearch = async (searchTerm: string, filters: SearchFilters = {}): Promise<SearchResultItem[]> => {
  const result = await esClient.search({
    index: VIDEO_INDEX,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: searchTerm,
              fields: ["title^3", "description", "tags"],
              fuzziness: "AUTO",
              operator: "and",
            },
          },
        ],
        filter: filters.category ? [{ term: { "category.keyword": filters.category } }] : [],
      },
    },
    highlight: {
      fields: {
        title: {},
        description: {},
      },
    },
  });

  return result.hits.hits.map((hit) => ({
    id: hit._id || "",
    ...(hit._source as object),
    score: hit._score,
    highlights: hit.highlight,
  }));
};

