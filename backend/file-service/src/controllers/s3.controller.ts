import { Request, Response } from "express";
import { 
    DeleteObjectCommand, 
    DeleteObjectsCommand, 
    ListObjectsV2Command, 
    PutObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    CompletedPart
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3.js";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export const generatePresignedUrl = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileName, fileType, folder } = req.body;

        if (!fileName || !fileType || !folder) {
            return res.status(400).json({ error: "fileName, fileType, and folder are required" });
        }
        const fileKey = `${folder}/${uuidv4()}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET || "videos",
            Key: fileKey,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return res.status(200).json({
            uploadUrl,
            fileKey,
            cdnUrl: `${process.env.CLOUDFRONT_URL || "http://localhost:9000"}/${fileKey}`
        });
    } catch (error) {
        console.error("S3 Presigned URL Error:", error);
        return res.status(500).json({ error: "S3 Error" });
    }
};

export const initiateMultipartUpload = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileName, fileType, folder } = req.body;
        if (!fileName || !fileType || !folder) {
            return res.status(400).json({ error: "fileName, fileType, and folder are required" });
        }

        const fileKey = `${folder}/${uuidv4()}-${fileName}`;
        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET || "videos",
            Key: fileKey,
            ContentType: fileType,
        });

        const response = await s3Client.send(command);
        return res.status(200).json({
            uploadId: response.UploadId,
            fileKey,
        });
    } catch (error) {
        console.error("Initiate Multipart Upload Error:", error);
        return res.status(500).json({ error: "Failed to initiate multipart upload" });
    }
};

export const getMultipartPresignedUrl = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileKey, uploadId, partNumber } = req.body;
        if (!fileKey || !uploadId || !partNumber) {
            return res.status(400).json({ error: "fileKey, uploadId, and partNumber are required" });
        }

        const command = new UploadPartCommand({
            Bucket: process.env.AWS_S3_BUCKET || "videos",
            Key: fileKey,
            UploadId: uploadId,
            PartNumber: parseInt(partNumber, 10),
        });

        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return res.status(200).json({
            presignedUrl,
            partNumber: parseInt(partNumber, 10),
        });
    } catch (error) {
        console.error("Get Multipart Presigned URL Error:", error);
        return res.status(500).json({ error: "Failed to generate presigned URL for part" });
    }
};

export const completeMultipartUpload = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileKey, uploadId, parts } = req.body;
        if (!fileKey || !uploadId || !parts || !Array.isArray(parts)) {
            return res.status(400).json({ error: "fileKey, uploadId, and parts array are required" });
        }

        const sortedParts: CompletedPart[] = parts.sort((a: CompletedPart, b: CompletedPart) => (a.PartNumber || 0) - (b.PartNumber || 0));

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET || "videos",
            Key: fileKey,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: sortedParts,
            },
        });

        const response = await s3Client.send(command);
        return res.status(200).json({
            success: true,
            fileKey,
            location: response.Location || `${process.env.CLOUDFRONT_URL || "http://localhost:9000"}/${fileKey}`,
        });
    } catch (error) {
        console.error("Complete Multipart Upload Error:", error);
        return res.status(500).json({ error: "Failed to complete multipart upload" });
    }
};

export const abortMultipartUpload = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileKey, uploadId } = req.body;
        if (!fileKey || !uploadId) {
            return res.status(400).json({ error: "fileKey and uploadId are required" });
        }

        const command = new AbortMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET || "videos",
            Key: fileKey,
            UploadId: uploadId,
        });

        await s3Client.send(command);
        return res.status(200).json({ success: true, message: "Multipart upload aborted successfully" });
    } catch (error) {
        console.error("Abort Multipart Upload Error:", error);
        return res.status(500).json({ error: "Failed to abort multipart upload" });
    }
};

export const generateSignedHlsUrl = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileKey, ttlSeconds = 3600 } = req.body;
        if (!fileKey) return res.status(400).json({ error: "fileKey is required" });

        const secret = process.env.SECURE_LINK_SECRET || "secret_signing_key";
        const expires = Math.floor(Date.now() / 1000) + parseInt(ttlSeconds.toString(), 10);
        const uri = `/${fileKey.replace(/^\//, "")}`;

        const hash = crypto.createHash("md5")
            .update(`${expires}${uri} ${secret}`)
            .digest("base64")
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");

        const cdnBase = process.env.CDN_URL || "http://localhost:8080";
        const signedUrl = `${cdnBase}${uri}?st=${hash}&expires=${expires}`;

        return res.status(200).json({ signedUrl, expires });
    } catch (err) {
        console.error("Generate Signed HLS URL Error:", err);
        return res.status(500).json({ error: "Failed to generate signed HLS URL" });
    }
};

export const handleDeleteFiles = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { fileKey, videoId, thumbnailKey } = req.body;
        await deleteVideoFromS3(fileKey, videoId, thumbnailKey);
        return res.status(200).json({ success: true, message: "Files deleted successfully from S3" });
    } catch (error) {
        console.error("S3 HTTP Delete Error:", error);
        return res.status(500).json({ error: "Failed to delete files from S3" });
    }
};

export const deleteVideoFromS3 = async (fileKey?: string, videoId?: string, thumbnailKey?: string): Promise<void> => {
    try {
        if (fileKey) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET || "videos",
                Key: fileKey,
            }));
            console.log(`✅ Raw video deleted: ${fileKey}`);
        }

        if (thumbnailKey) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET || "videos",
                Key: thumbnailKey,
            }));
            console.log(`🖼️ Thumbnail deleted: ${thumbnailKey}`);
        }

        if (videoId) {
            const folderPrefix = `transcoded/${videoId}`;

            const listCommand = new ListObjectsV2Command({
                Bucket: process.env.AWS_S3_BUCKET || "videos",
                Prefix: folderPrefix,
            });

            const list = await s3Client.send(listCommand);

            if (list.Contents && list.Contents.length > 0) {
                const deleteParams = {
                    Bucket: process.env.AWS_S3_BUCKET || "videos",
                    Delete: { 
                        Objects: list.Contents.map((obj) => ({ Key: obj.Key! })) 
                    },
                };

                await s3Client.send(new DeleteObjectsCommand(deleteParams));
                console.log(`📂 HLS folder deleted: ${folderPrefix}`);
            }
        }
    } catch (error) {
        console.error("❌ S3 Deletion Error:", error);
        throw error;
    }
};
