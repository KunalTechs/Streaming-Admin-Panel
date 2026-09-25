import { Kafka } from "kafkajs";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "admin-auth-services",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

export const initTopics = async (): Promise<void> => {
  const admin = kafka.admin();
  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: [
        { topic: "admin-events", numPartitions: 3 },
        { topic: "audit-logs", numPartitions: 3 },
        { topic: "ADMIN_CREATED", numPartitions: 1 },
        { topic: "ADMIN_DELETED", numPartitions: 1 },
      ],
    });
    console.log("✅ Kafka Topics Initialized");
  } catch (error) {
    const err = error as Error;
    if (!err.message.includes("already exists")) {
      console.error("Kafka Admin Error:", err);
    }
  } finally {
    await admin.disconnect().catch(() => {});
  }
};

export default kafka;
