import {S3Client} from '@aws-sdk/client-s3';
import 'dotenv/config';

export const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    }
});

export const BUCKET_NAME = process.env.BUCKET_NAME;