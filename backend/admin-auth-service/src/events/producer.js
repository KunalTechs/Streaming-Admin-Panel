import kafka from "../config/kafka.js";
import {Partitioners} from "kafkajs";

const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
});

export const connectProducer = async () =>{
    try {
        await producer.connect();
        console.log("Kafka Producer Connected");
    } catch (error) {
        console.log("Kafka Producer Connection Error:",error)
    }
};

export const emitEvent = async (topic, key, payload) =>{
    try {
        await producer.send({
            topic,
            messages:[{
                key: String(key),
                value: JSON.stringify(payload)
            }],
        })
    } catch (error) {
        console.error(` Failed to send event to ${topic}:`, error);
    }
};