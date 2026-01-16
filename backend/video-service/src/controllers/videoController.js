import prisma from "../config/prisma.js";

export const uploadVideo = async (req, res) => {
  try {
    const { title, adminId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "no video file uplaoded" });
    }

    // Save metadata to MySQL using Prisma
    const newVideo = await prisma.video.create({
      data: {
        title: title,
        filename: file.filename,
        url: `/uploads/videos/${file.filename}`,
        author: {
          connect: { id: adminId.replace(/"/g, "") },
        },
      },
    });

    res
      .status(200)
      .json({ message: "video Upload successfully", video: newVideo });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
