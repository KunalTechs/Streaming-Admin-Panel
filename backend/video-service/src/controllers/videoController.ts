import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "ioredis";

const extractS3Key = (url: string | null): string | null => {
  if (!url) return null;
  const cloudfrontUrl = process.env.CLOUDFRONT_URL || "";
  return url.replace(`${cloudfrontUrl}/`, "");
};

// Upload Video
export const uploadVideo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, adminId, categoryId, description, fileKey, thumbnailKey, tags } = req.body;
    
    if (!fileKey) {
      return res.status(400).json({ error: "No S3 file key provided" });
    }

    // Clean the adminId
    const cleanedAdminId = adminId ? adminId.replace(/"/g, "") : null;

    if (!cleanedAdminId) {
      return res.status(400).json({ error: "Valid Admin ID is required" });
    }

    // Save metadata and Outbox Event atomically using Prisma Transaction
    const newVideo = await prisma.$transaction(async (tx) => {
      const video = await tx.video.create({
        data: {
          title: title,
          description: description || "",
          filename: fileKey,
          url: `${process.env.CLOUDFRONT_URL}/${fileKey}`,
          thumbnailUrl: thumbnailKey ? `${process.env.CLOUDFRONT_URL}/${thumbnailKey}` : null,
          categoryId: categoryId || null,
          tags: tags || [],
          author: {
            connect: { id: cleanedAdminId },
          },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateId: video.id,
          eventType: "VIDEO_UPLOADED",
          payload: {
            videoId: video.id, 
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            category: video.categoryId,
            tags: video.tags,
            fileKey: video.filename,
            adminId: cleanedAdminId,
          }
        }
      });

      return video;
    });

    res
      .status(200)
      .json({ message: "video Upload successfully", video: newVideo });
  } catch (error: any) {
    console.error("Upload Error:", error);

    if (error.code === 'P2002') {
        return res.status(409).json({ error: "This file has already been uploaded." });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete Video
export const deleteVideo = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

    // Find video to get the filename
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) return res.status(404).json({ error: "Video not found" });

    // Delete file from local storage if existing
    const filePath = path.join(process.cwd(), "uploads/videos", video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from Database and create Outbox Event atomically
    await prisma.$transaction(async (tx) => {
      await tx.video.delete({ where: { id } });

      await tx.outboxEvent.create({
        data: {
          aggregateId: video.id,
          eventType: "VIDEO_DELETED",
          payload: {
            fileKey: video.filename,
            videoId: video.id,
            thumbnailKey: video.thumbnailUrl ? extractS3Key(video.thumbnailUrl) : null
          }
        }
      });
    });

    res.status(200).json({ message: "Video Deleted Successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Delete Failed" });
  }
};

// Update Video
export const updateVideo = async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { title, description, categoryId, tags } = req.body;

    const updatedVideo = await prisma.$transaction(async (tx) => {
      const video = await tx.video.update({
        where: { id },
        data: {
          title: title,
          description: description,
          categoryId: categoryId,
          tags: tags || [],
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateId: video.id,
          eventType: "VIDEO_UPDATED",
          payload: {
            videoId: video.id,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnailUrl,
            category: video.categoryId,
            tags: tags || [],
            updatedAt: video.updatedAt
          }
        }
      });

      return video;
    });

    res.status(200).json({ 
      message: "Video updated successfully", 
      updatedVideo 
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Update failed" });
  }
};

export const getVideos = async (req: Request, res: Response): Promise<any> => {
  try {
    const adminId = req.user?.id;
    const role = req.user?.role;
    const { page = 1, limit = 10, search = "", categoryId } = req.query;

    const p = parseInt(page as string);
    const l = parseInt(limit as string);

    const queryFilter: any = {
      title: { contains: search as string, mode: 'insensitive' },
      ...(role !== "superadmin" && { authorId: adminId }),
      ...(categoryId && { categoryId: categoryId as string }),
    };

    const videos = await prisma.video.findMany({
      where: queryFilter,
      take: l,
      skip: (p - 1) * l,
      include: {
        author: {
          select: { username: true, email: true },
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

const redisSub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
});

/**
 * Real-Time Transcoding Progress Stream (Server-Sent Events)
 */
export const streamTranscodeProgress = (req: Request, res: Response): void => {
  const { videoId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ videoId, status: "CONNECTED", percent: 0 })}\n\n`);

  const onMessage = (channel: string, message: string) => {
    if (channel === "transcode-progress") {
      try {
        const data = JSON.parse(message);
        if (data.videoId === videoId) {
          res.write(`data: ${message}\n\n`);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            res.end();
          }
        }
      } catch (err) {}
    }
  };

  redisSub.subscribe("transcode-progress");
  redisSub.on("message", onMessage);

  req.on("close", () => {
    redisSub.removeListener("message", onMessage);
  });
};

/**
 * AES-128 DRM Decryption Key Retrieval for HLS Player
 */
export const getHlsDecryptionKey = async (req: Request, res: Response): Promise<any> => {
  try {
    const videoId = req.params.videoId as string;
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) return res.status(404).send("Video not found");

    // Generate deterministic 16-byte key buffer for video
    const keyBuffer = Buffer.from(
      crypto.createHash("md5").update(`secret_drm_salt_${videoId}`).digest("hex").substring(0, 32),
      "hex"
    );

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, private");
    res.send(keyBuffer);
  } catch (err: any) {
    console.error("DRM Key Retrieval Error:", err.message);
    res.status(500).send("Error fetching decryption key");
  }
};
