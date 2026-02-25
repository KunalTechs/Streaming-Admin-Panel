import kafka from "../config/kafka.js";

const producer = kafka.producer();

export const connectProducer =async () =>{
    await producer.connect();
    console.log("Category Producer Connected ");
};

export const emitCategoryEvent =  async (topic, data) =>{
    try {
         await producer.send({
        topic: 'category-events',
        messages: [{value: JSON.stringify(data)}]
    });
    console.log(`📡 Kafka Event Emitted: ${event}`);
    } catch (error) {
        console.error('❌ Kafka Producer Error:', error);
    }finally {
       
        await producer.disconnect();
     }
   
};