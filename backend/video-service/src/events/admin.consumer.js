import { consumer } from "../config/kafka.js";
import prisma from "../config/prisma.js";

export const initAdminConsumer = async () => {
  await consumer.connect();
  //create the topic admin-created for video-serive to only when need
  await consumer.subscribe({ topic: "ADMIN_CREATED", fromBeginning: true, allowAutoTopicCreation: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      //Parse the incoming Kafka message
      const data = JSON.parse(message.value.toString());

      try {
        await prisma.admin.create({
          data: {
            id: data.id,
            username: data.username,
            email: data.email,
          },
        });
      } catch (error) {
        console.warn("sync skipped"), error.message;
      }
    },
  });
};

export default initAdminConsumer;