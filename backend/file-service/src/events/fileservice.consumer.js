import { consumer } from "../config/kafka.js";
import { deleteVideoFromS3 } from "../controllers/s3.controller.js";

export const initKafkaConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "video-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        const { event, data } = payload;

        if (event === "VIDEO_DELETED") {
          console.log(`📥 Processing deletion for video: ${data.videoId}`);
          await deleteVideoFromS3(
            data.fileKey,
            data.videoId,
            data.thumbnailKey,
          );
        }
      } catch (error) {
        console.error("❌ Kafka Consumer Error:", error.message);
      }
    },
  });
};
