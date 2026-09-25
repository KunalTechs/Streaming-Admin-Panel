import { S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";

export const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.AWS_SECRET_KEY || "minioadmin",
    },
    endpoint: process.env.AWS_ENDPOINT || undefined,
    forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === "true",
});
