import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3.js";
import { v4 as uuidv4 } from "uuid";

export const generatePresignedUrl = async (req, res) =>{
    try {
        const { fileName ,fileType ,folder } = req.body;
        //folder could be thumbnail or videos

        if(!fileName || !fileType || !folder){
            return resizeBy.status(400).json({error: "fileName, fileType, and folder are required"})
        }
        const fileKey = `${folder}/${uuidv4}-${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileKey,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, {expiresIn: 300});

        res.status(200).json({
            uploadUrl,
            fileKey,
            cdnUrl: `${process.env.CLOUDFRONT_URL}/${fileKey}`
        });
    } catch (error) {
        console.error("S3 Presigned URL Error:", error);
        res.status(500).json({ error: "S3 Error" });
    };
};

// Delete Video and its HLS Folder from S3

export const deleteVideoFromS3 = async (fileKey, videoId, thumbnailKey) => {
    try {
        // Delete the Raw Video File
        if (fileKey) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileKey,
            }));
            console.log(`✅ Raw video deleted: ${fileKey}`);
        }

        // Delete the Thumbnail
        if (thumbnailKey) {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: thumbnailKey,
            }));
            console.log(`🖼️ Thumbnail deleted: ${thumbnailKey}`);
        }

        // Delete the Transcoded HLS Folder
        if (videoId) {
            const folderPrefix = `transcoded/${videoId}`;

            const listCommand = new ListObjectsV2Command({
                Bucket: process.env.AWS_S3_BUCKET,
                Prefix: folderPrefix,
            });

            const list = await s3Client.send(listCommand);

            
            if (list.Contents && list.Contents.length > 0) {
                const deleteParams = {
                    Bucket: process.env.AWS_S3_BUCKET,
                    Delete: { 
                        Objects: list.Contents.map((obj) => ({ Key: obj.Key })) 
                    },
                };

                await s3Client.send(new DeleteObjectsCommand(deleteParams));
                console.log(`📂 HLS folder deleted: ${folderPrefix}`);
            }
        }
    } catch (error) {
        console.error("❌ S3 Deletion Error:", error);
        throw error; // Re-throw so Kafka consumer knows it failed
    }
};