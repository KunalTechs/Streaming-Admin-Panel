import kafka from "../config/kafka.js";

const producer = kafka.producer();

export const connectProducer = async (): Promise<void> => {
    try {
        await producer.connect();
        console.log("Category Producer Connected");
    } catch (err: any) {
        console.warn("⚠️ Category Producer connection deferred/warning:", err.message);
    }
};

export const emitCategoryEvent = async (topic: string, data: any): Promise<void> => {
    try {
        await producer.send({
            topic: topic || 'category-events',
            messages: [{ value: JSON.stringify(data) }]
        });
        console.log(`📡 Kafka Event Emitted to ${topic}:`, data.type || data.event);
    } catch (error: any) {
        console.error('❌ Kafka Producer Error:', error.message);
    }
};
