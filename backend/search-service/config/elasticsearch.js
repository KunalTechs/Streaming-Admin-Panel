import {Client} from "@elastic/elasticsearch";
import "dotenv/config";

export const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL 
});

export const checkConnection =async () =>{
    try {
        const health = await esClient.cluster.health({});
            console.log("Elasticsearch connected:",health.status);
    } catch (error) {
        console.error ("Elasticsearch connection failed", error.message);
    }
};