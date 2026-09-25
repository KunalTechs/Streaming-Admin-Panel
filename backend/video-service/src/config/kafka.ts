import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "video-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

export const consumer = kafka.consumer({ groupId: "video-service-group" });
export const producer = kafka.producer();
