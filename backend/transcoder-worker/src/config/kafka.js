import {Kafka} from 'kafkajs';
import 'dotenv/config';

const kafka = new Kafka ({
    clientId: "transcoder-worker",
    brokers: [process.env.KAFKA_BROKER],
});

export const consumer = kafka.consumer({groupId: "transcoder-worker-group"});
export const producer = kafka.producer({groupId: "transcoder-worker-group"})
