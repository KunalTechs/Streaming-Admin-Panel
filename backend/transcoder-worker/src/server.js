import dotenv from "dotenv";
import { startTranscoderConsumer } from "./events/transcoder.consumer.js";
import { consumer } from "./config/kafka.js"; // Import your consumer instance

dotenv.config();

/**
 * Handle Graceful Shutdown
 */
const shutdown = async (signal) => {
    console.log(`\n🛑 ${signal} received. Cleaning up...`);
    try {
        // Tell Kafka we are leaving so it can rebalance the group immediately
        await consumer.disconnect();
        console.log("📡 Disconnected from Kafka.");
    } catch (err) {
        console.error("Error during Kafka disconnect:", err);
    }
    process.exit(0);
};

// Listen for termination signals
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/**
 * Start the Transcoder Worker
 */
const startWorker = async () => {
    console.log("-----------------------------------------");
    console.log("🎬 TRANSCODER WORKER STARTING...");
    console.log("-----------------------------------------");

    try {
        await startTranscoderConsumer();
        console.log("✅ Worker is online and connected to Kafka.");
    } catch (error) {
        console.error("❌ Failed to start Transcoder Worker:", error);
        process.exit(1);
    }
};

// Start the process
startWorker();