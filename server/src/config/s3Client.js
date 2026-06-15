import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export const bucketName = process.env.AWS_S3_BUCKET_NAME;

export const isS3Configured = Boolean(region && accessKeyId && secretAccessKey && bucketName);

export const s3Client = new S3Client({
    region: region || "us-east-1",
    followRegionRedirects: true,
    credentials: accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
        }
        : undefined,
});
