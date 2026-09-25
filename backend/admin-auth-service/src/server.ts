import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initTopics } from "./config/kafka.js";
import { connectProducer } from "./events/producer.js";

const PORT: number = parseInt(process.env.PORT || "4001", 10);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await initTopics();
    await connectProducer();

    app.listen(PORT, () => {
      console.log(`🚀 Admin Auth Service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start Admin Auth Service:", error);
    process.exit(1);
  }
};

startServer();
