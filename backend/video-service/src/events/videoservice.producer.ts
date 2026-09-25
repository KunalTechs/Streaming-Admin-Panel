import { producer } from "../config/kafka.js";

export const emitVideoEvent = async (event: string, data: Record<string, unknown>): Promise<void> => {
    try {
        await producer.connect();
        await producer.send({
            topic: "video-events",
            messages: [
                { value: JSON.stringify({ event, data }) }
            ]
        });
        console.log(`📡 Video Event Published to Kafka: ${event}`);
    } catch (error) {
        console.error("❌ Kafka Producer Error in Video Service:", error);
    } finally {
        await producer.disconnect().catch(() => {});
    }
};
