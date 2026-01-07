import {Kafka} from "kafkajs"

const kafka =new Kafka({
    clientId: "video-service",
    brokers:[process.env.KAFKA_BROKER],
});

export const cosumer = kafka.consumer({groupId: "video-service-group"});