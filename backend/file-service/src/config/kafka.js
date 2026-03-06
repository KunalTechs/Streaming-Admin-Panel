import {Kafka} from "kafkajs";

const kafka = new Kafka({
    clientId:"file-service",
    brokers:[process.env.KAFKA_BROKER],

})

export const consumer = kafka.consumer({groupId:"file-service-group"});