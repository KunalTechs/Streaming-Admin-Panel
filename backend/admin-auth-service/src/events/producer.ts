import kafka from "../config/kafka.js";
import { Partitioners } from "kafkajs";

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
});

export const connectProducer = async (): Promise<void> => {
    try {
        await producer.connect();
        console.log("✅ Kafka Producer Connected");
    } catch (error) {
        console.log("❌ Kafka Producer Connection Error:", error);
    }
};

export const emitEvent = async (topic: string, key: string | number, payload: unknown): Promise<void> => {
    try {
        await producer.send({
            topic,
            messages: [{
                key: String(key),
                value: JSON.stringify(payload)
            }],
        });
    } catch (error) {
        console.error(`❌ Failed to send event to ${topic}:`, error);
    }
};
