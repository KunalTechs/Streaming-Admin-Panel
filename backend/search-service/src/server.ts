import "dotenv/config";
import app from "./app.js";
import { checkConnection } from "./config/elasticsearch.js";
import { connectRedis } from "./config/redis.js";
import { startSearchConsumer } from "./events/search.consumer.js";

const PORT: number = parseInt(process.env.PORT || "4005", 10);

const startServer = async (): Promise<void> => {
    try {
        await checkConnection();
        await connectRedis();

        try {
            await startSearchConsumer();
        } catch (kafkaErr) {
            const err = kafkaErr as Error;
            console.warn("⚠️ Search Kafka Consumer Warning:", err.message);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Search Service listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start Search Service:", error);
        process.exit(1);
    }
};

startServer();
