import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./events/category.producer.js";
import prisma from "./config/prisma.js";
import { connectRedis } from "./config/redis.js";
import { initCategoryTopics } from "./config/kafka.js";

const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    // connect to prisma
    await prisma.$connect();
    console.log("prisma is running");

    // Initialize Kafka Topics and Producer
    try {
      await initCategoryTopics();
      await connectProducer();
    } catch (kafkaErr: any) {
      console.warn("⚠️ Category Service Kafka connection deferred:", kafkaErr.message);
    }

    // Connect to Redis
    try {
      await connectRedis();
    } catch (redisErr: any) {
      console.warn("⚠️ Category Service Redis connection deferred:", redisErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on address http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Category Service server:", error);
    process.exit(1);
  }
};

app.get("/", (req, res) => { res.send("Server is live..."); });

startServer();
