import { consumer } from "../config/kafka.js";
import prisma from "../config/prisma.js";

export interface AdminDeletionPayload {
    deletedAdminId: string;
    newOwnerId?: string;
}

const handleAdminDeletion = async (data: AdminDeletionPayload): Promise<void> => {
  const { deletedAdminId, newOwnerId } = data;

  if (newOwnerId) {
    try {
      await prisma.video.updateMany({
        where: { authorId: deletedAdminId },
        data: { authorId: newOwnerId },
      });
      console.log(`Videos reassigned to ${newOwnerId}`);
    } catch (error) {
      const err = error as Error;
      console.warn("delete admin transfer error:", err.message);
    }
  } else {
    try {
      await prisma.video.updateMany({
        where: { authorId: deletedAdminId },
        data: {
          adminDeletedAt: new Date(),
        },
      });
      console.log(`Videos marked for deletion after 5 days.`);
    } catch (error) {
      const err = error as Error;
      console.warn("delete admin content error:", err.message);
    }
  }
};

export const initVideoServiceConsumers = async (): Promise<void> => {
  await consumer.connect();

  await consumer.subscribe({
    topics: [
      "ADMIN_CREATED",
      "ADMIN_DELETED",
      "category-events",
      "video-events",
    ],
    fromBeginning: true,
  });

  console.log("📥 Video Service Consumer listening on separate topics...");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString());

      try {
        if (topic === "ADMIN_CREATED") {
          await prisma.admin.create({
            data: {
              id: payload.id,
              username: payload.username,
              email: payload.email,
            },
          });
          console.log(`👤 Admin Synced: ${payload.username}`);
        } else if (topic === "ADMIN_DELETED") {
          await handleAdminDeletion(payload as AdminDeletionPayload);
        }
        else if (topic === "category-events") {
          const eventName = payload.event || payload.type;
          const data = payload.data || payload;
          if (eventName === "CATEGORY_DELETED") {
            await prisma.video.updateMany({
              where: { categoryId: data.id },
              data: { categoryId: null },
            });
            console.log(`✅ Unlinked videos from deleted category: ${data.id}`);
          }
        }
        else if (topic === "video-events") {
          const eventName = payload.event || payload.type;
          const data = payload.data || payload;
          if (eventName === "TRANSCODING_FINISHED") {
            const { videoId, hlsKey } = data;

            console.log(`🎬 Transcoding complete for ${videoId}. Updating URL...`);
            const hlsUrl = `${process.env.CLOUDFRONT_URL || "http://localhost:9000"}/${hlsKey}`;

            await prisma.video.update({
              where: { id: videoId },
              data: {
                url: hlsUrl,
                status: "READY",
              },
            });
            console.log(`✅ Video ${videoId} is now LIVE.`);

          } else if (eventName === "TRANSCODING_FAILED") {
            const { videoId, reason } = data;
            console.error(`⚠️ Video ${videoId} failed processing: ${reason}`);

            try {
              await prisma.video.update({
                where: { id: videoId },
                data: {
                  status: "FAILED",
                  description: `Error: ${reason}`,
                },
              });
              console.log(`❌ Updated status to FAILED for video ${videoId}`);
            } catch (dbError) {
              const err = dbError as Error;
              console.error("Failed to update failure status in DB:", err.message);
            }
          }
        }
      } catch (error) {
        const err = error as Error;
        console.warn(`⚠️ Sync skipped or failed for topic ${topic}:`, err.message);
      }
    },
  });
};
