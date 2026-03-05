import { producer } from "../config/kafka";

export const emitVideoEvent = async (event, data) => {
    try {
        await producer.connect();
        await producer.send({
            topic: 'video-events',
            messages: [
                {value: JSON.stringify({event, data})}
            ],
        });
        console.log(` Kafka Event Sent: ${event} `);
    } catch (error) {
        console.error(' Kafka Producer Error:', error);
    } finally {
        await producer.disconnect();
    }
};