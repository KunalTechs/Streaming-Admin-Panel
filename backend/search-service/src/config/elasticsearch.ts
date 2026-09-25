import { Client } from "@elastic/elasticsearch";
import "dotenv/config";

export const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || "http://localhost:9200"
});

export const checkConnection = async (): Promise<void> => {
    try {
        const health = await esClient.cluster.health({});
        console.log("Elasticsearch connected:", health.status);
    } catch (error) {
        const err = error as Error;
        console.error("Elasticsearch connection failed:", err.message);
    }
};
