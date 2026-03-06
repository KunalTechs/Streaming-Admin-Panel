import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";

//UploadVideo
export const uploadVideo = async (req, res) => {
  try {
    const { title, adminId, categoryId, description, fileKey, thumbnailUrl } = req.body;
    
    if(!fileKey){
      return res.status(400).json({error: "No S3 file key provided"});
    }

    // Clean the adminId
    const cleanedAdminId = adminId ? adminId.replace(/"/g, "") : null;

    if (!cleanedAdminId) {
       return res.status(400).json({ error: "Valid Admin ID is required" });
    }

    // Save metadata to MySQL using Prisma
    const newVideo = await prisma.video.create({
      data: {
        title: title,
        description: description || "",
        filename: fileKey,
        url: `${process.env.CLOUDFRONT_URL}/${fileKey}`,
        thumbnailUrl: `${process.env.CLOUDFRONT_URL}/${thumbnailKey}`,
        categoryId: categoryId || null,
        author: {
          connect: { id: adminId.replace(/"/g, "") },
        },
      },
    });

    await emitVideoEvent("VIDEO_UPLOADED", { 
      videoId: newVideo.id, 
      fileKey: fileKey,
      title: newVideo.title 
    });

    res
      .status(200)
      .json({ message: "video Upload successfully", video: newVideo });
  } catch (error) {
    console.error("Upload Error:", error);

    if (error.code === 'P2002') {
        return res.status(409).json({ error: "This file has already been uploaded." });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete Video
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    //Find video to get the filename
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return res.status(404).json({ error: "Video not found" });

    //Delete file from local storage
    //for temparary untill file service not made and minIO not implement
    const filePath = path.join(process.cwd(), "uploads/videos", video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const videoId = video.id;

    //Delete from Database
    await prisma.video.delete({ where: { id } });

    await emitVideoEvent("VIDEO_DELETED", {
      fileKey: video.filename, //  "raw-videos/abc.mp4"
      videoId: video.id, //  "uuid-123"
     thumbnailKey: video.thumbnailUrl ? extractS3Key(video.thumbnailUrl) : null
    });

    res.status(200).json({ message: "Video Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ error: "Delete Failed" });
  }
};

// Update Video
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId } = req.body;

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        title: title,
        description: description,
        categoryId: categoryId,
      },
    });
   res.status(200).json({ 
      message: "Video updated successfully", 
      updatedVideo 
    });
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
};

export const getVideos = async (req, res) => {
  try {
    const { id: adminId, role } = req.user;
   const { page = 1, limit = 10, search = "", categoryId } = req.query;

   const p = parseInt(page);
    const l = parseInt(limit);

    const queryFilter = {
      title: { contains: search, mode: 'insensitive' },
      ...(role !== "superadmin" && { authorId: adminId }),
      ...(categoryId && { categoryId: categoryId }),
    };

    const videos = await prisma.video.findMany({
      where: queryFilter,
      take: l, // Limit results
      skip: (p - 1) * l,
      include: {
        author: {
          select: { username: true, email: true }, // SuperAdmin can see who uploaded what
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.video.count({ where: queryFilter });

    res.json({
      videos,
      pagination: {
        total,
        page: p,
        pages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "failed to fetch videos" });
  }
};
