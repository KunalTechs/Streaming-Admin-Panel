import { Kafka } from 'kafkajs';
import 'dotenv/config';

const kafka = new Kafka({
    clientId: 'search-service',
    brokers: [process.env.KAFKA_BROKER],
});

export const consumer = kafka.consumer({groupId: "search-service-group"});