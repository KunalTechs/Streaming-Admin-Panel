import { consumer } from "../config/kafka.js";
import prisma from "../config/prisma.js";

const handleAdminDeletion = async (data) =>{
  const {deletedAdminId, newOwnerId} = data;

  if(newOwnerId) {
    // OPTION A: Reassign to SuperAdmin or a specific New Admin
    try {
       await prisma.video.updateMany({
      where: {authorId: deletedAdminId},
      data: {authorId: newOwnerId}
    });
    console.log(`Videos reassigned to ${newOwnerId}`);
    } catch (error) {
        console.warn("delete admin transfer "), error.message;
    }
  }else{
    // OPTION B: Mark for deletion in 5 days
    try{
      await prisma.video.updateMany({
      where: {authorId:deletedAdminId},
      data:{
        status: 'TRASH',
        adminDeletedAt: new Date()
      }
    })
    console.log(`Videos marked for deletion after 5 days.`);
    } catch (error) {
       console.warn("delete admin content "), error.message;
    }
    
  }

}

export const initAdminConsumer = async () => {
  await consumer.connect();
  //create the topic admin-created for video-serive to only when need
  await consumer.subscribe({ topics: ["ADMIN_CREATED", "ADMIN_DELETED"], fromBeginning: true, });

  await consumer.run({
    eachMessage: async ({ message }) => {
      //Parse the incoming Kafka message
      const data = JSON.parse(message.value.toString());

      try {
        if(topic === "ADMIN_CREATED")
        await prisma.admin.create({
          data: {
            id: data.id,
            username: data.username,
            email: data.email,
          },
        });
        else if (topic === "ADMIN_DELETED") {
          //  reassignment/trash
          await handleAdminDeletion(data);
        }
      } catch (error) {
        console.warn("sync skipped"), error.message;
      }
    },
  });
};

export default initAdminConsumer;