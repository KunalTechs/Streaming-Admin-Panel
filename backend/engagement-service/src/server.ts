import dotenv from "dotenv";
import app from "./app.js";
import { producer } from "./config/kafka.js";
import { initDB } from "./config/db.js";
import { startBatchWriterWorker } from "./events/engagement.batch.worker.js";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "5006", 10);

const startServer = async (): Promise<void> => {
    try {
        await initDB();

        try {
            await producer.connect();
            console.log("✅ Engagement Kafka Producer connected");
        } catch (err) {
            const error = err as Error;
            console.warn("⚠️ Engagement Kafka Producer Warning:", error.message);
        }

        try {
            await startBatchWriterWorker();
        } catch (err) {
            const error = err as Error;
            console.warn("⚠️ Engagement Batch Writer Worker Warning:", error.message);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Engagement Service listening on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start Engagement Service:", error);
        process.exit(1);
    }
};

startServer();
