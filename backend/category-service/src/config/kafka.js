import {Kafka} from 'kafkajs';

const kafka = new Kafka({
    clientId: "category-service",
    brokers: [process.env.KAFKA_BROKER]
});

export const initCategoryTopics = async () => {
    const admin = kafka.admin();
    try {
        await admin.connect();
        await admin.createTopics({
            waitForLeaders: true,
            topics: [{ topic: "category-events", numPartitions: 1 }],
        });
        console.log("✅ Category Topics Initialized: category-events");
    } catch (error) {
        if (!error.message.includes("already exists")) {
            console.error("❌ Kafka Category Admin Error:", error.message);
        }
    } finally {
        await admin.disconnect();
    }
};

export default kafka;