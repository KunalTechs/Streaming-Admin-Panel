import {Kafka} from "kafkajs"
import "dotenv/config";

const kafka = new Kafka({
    clientId: "admin-auth-services",
    brokers: [process.env.KAFKA_BROKER]
});

export const initTopics = async () =>{
    const admin = kafka.admin();
    try {
        await admin.connect();
        await admin.createTopics({
            waitForLeaders:true,
            topics: [
                {topic:"admin-events", numPartitions: 3},
                {topic: "audit-logs", numPartitions:3}
            ],
        });
        console.log("Kafka Topics InItialized")
    } catch (error) {
        if(!error.message.includes("already exists")){
            console.error( "Kafka Admin Error", error)
        }
        
    } finally {
        await admin.disconnect();
    }
};

export default kafka;