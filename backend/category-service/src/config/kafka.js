import {Kafka} from 'kafkajs';

const kafka = new Kafka({
    clientId: "category-service",
    brokers: [process.env.KAFKA_BROKER]
});

export default kafka;