import "dotenv/config";
import app from "./app.js";
import prisma from "./config/prisma.js";
import { initVideoServiceConsumers } from "./events/videoservice.consumers.js";
import { startOutboxPublisher } from "./services/outbox.service.js";

const PORT = process.env.PORT || 5002;

const startServer = async () => {
  try {
    // Test Database Connection
    await prisma.$connect();
    console.log("prisma is running");

    // Start Transactional Outbox Publisher
    startOutboxPublisher(3000);

    // Start Kafka Consumer
    try {
      await initVideoServiceConsumers();
      console.log("kafka consumer is running");
    } catch (kafkaErr: any) {
      console.warn("⚠️ Video Service Kafka consumer warning:", kafkaErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on address http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

app.get("/", (req, res) => { res.send("Server is live..."); });

startServer();
