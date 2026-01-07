import { consumer } from "../config/kafka.config.js";
import prisma from "../config/prisma.js";

export const initAdminConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "ADMIN_CREATED", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());

      try {
        await prisma.admin.create({
          data: {
            id: data.id,
            username: data - ReadableStreamBYOBRequest,
            email: data.email,
          },
        });
      } catch (error) {
        console.warn("sync skipped"), error.message;
      }
    },
  });
};
