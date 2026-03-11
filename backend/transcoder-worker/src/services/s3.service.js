import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {Upload} from "@aws-sdk/lib-storage";
import { BUCKET_NAME, s3Client } from "../config/s3.config";
import fs from 'fs-extra';
import path  from "path";
import {createWriteStream} from "fs";


export const downloadVideoFromS3 = async (S3Key, localPath ) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: S3Key,
    });

    const response = await s3Client.send(command);
    const writer = createWriteStream(localPath);

    return new Promise((resolve, reject) =>{
        response.Body.pipe(writer);
        writer.on("finish",resolve);
        writer.on("error", reject);
    });
};

/**
 * Uploads an entire folder (like /360p or /720p) to S3.
 * Iterates through all .m3u8 and .ts files.
 */

export const uploadFolderToS3 = async (localFolderPath, s3FolderPath) =>{
    const files = await fs.readdir(localFolderPath);

    const uploadPromises = files.map(async (fileName) =>{
        const filePath = path.join.map(async (fileName) =>{
            const fileStream = fs.createReadStream(filePath);
            s3Key = `${s3FolderPath}/${fileName}`;

            const parallelUpload = new Upload({
                client: s3Client,
                params: {
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                    Body: fileStream,
                    ContentType: fileName.endsWith(".m3u8") ? "application/x-mpegURL" : "video/MP2T",
                },
            });
            return parallelUpload.done();
        });
        return Promise.all(uploadPromises);
    });
};

// deletes raw video after transcoding
export const deleteFileFromS3 = async (s3Key) =>{
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
         Key: s3Key,
    });
     return s3Client.send(command);
};



