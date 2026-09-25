import { Kafka } from "kafkajs";
import dotenv from "dotenv";
dotenv.config();

export const kafka = new Kafka({
    clientId: "search-service",
    brokers: [process.env.KAFKA_BROKER || "localhost:9092"]
});

export const consumer = kafka.consumer({ groupId: "search-service-group" });
