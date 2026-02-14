import kafka from "../config/kafka.js";

const producer = kafka.producer();

export const connectProducer =async () =>{
    await producer.connect();
    console.log("Category Producer Connected ");
};

export const emitCategoryEvent =  async (topic, data) =>{
    await producer.send({
        topic,
        messages: [{value: JSON.stringify(data)}]
    });
};