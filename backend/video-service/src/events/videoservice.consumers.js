import { consumer } from "../config/kafka.js";
import prisma from "../config/prisma.js";

const handleAdminDeletion = async (data) => {
  const { deletedAdminId, newOwnerId } = data;

  if (newOwnerId) {
    // OPTION A: Reassign to SuperAdmin or a specific New Admin
    try {
      await prisma.video.updateMany({
        where: { authorId: deletedAdminId },
        data: { authorId: newOwnerId },
      });
      console.log(`Videos reassigned to ${newOwnerId}`);
    } catch (error) {
      (console.warn("delete admin transfer "), error.message);
    }
  } else {
    // OPTION B: Mark for deletion in 5 days
    try {
      await prisma.video.updateMany({
        where: { authorId: deletedAdminId },
        data: {
          status: "TRASH",
          adminDeletedAt: new Date(),
        },
      });
      console.log(`Videos marked for deletion after 5 days.`);
    } catch (error) {
      (console.warn("delete admin content "), error.message);
    }
  }
};

export const initVideoServiceConsumers = async () => {
  await consumer.connect();

  // Subscribing to all relevant topics
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
      const payload = JSON.parse(message.value.toString());

      try {
        // --- ADMIN SYNC ---
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
          await handleAdminDeletion(payload);
        }

        // --- CATEGORY SYNC ---
        else if (topic === "category-events") {
          const { event, data } = payload;
          if (event === "CATEGORY_DELETED") {
            await prisma.video.updateMany({
              where: { categoryId: data.id },
              data: { categoryId: null },
            });
            console.log(`✅ Unlinked videos from deleted category: ${data.id}`);
          }
        }

        // --- TRANSCODER SYNC (The most important part!) ---
        else if (topic === "video-events") {
          const { event, data } = payload;
          if (event === "TRANSCODING_FINISHED") {
            const { videoId, hlsKey } = data;

            console.log(
              `🎬 Transcoding complete for ${videoId}. Updating URL...`,
            );

            const hlsUrl = `${process.env.CLOUDFRONT_URL}/${hlsKey}`;

            await prisma.video.update({
              where: { id: videoId },
              data: {
                url: hlsUrl,
                status: "READY", // User can now watch the video!
              },
            });
            console.log(`✅ Video ${videoId} is now LIVE.`);

          } else if (event === "TRANSCODING_FAILED") {
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
              console.error(
                "Failed to update failure status in DB:",
                dbError.message,
              );
            }
          }
        }
      } catch (error) {
        // Log the actual error message so you can debug if Prisma fails
        console.warn(
          `⚠️ Sync skipped or failed for topic ${topic}:`,
          error.message,
        );
      }
    },
  });
};
