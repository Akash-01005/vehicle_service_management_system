import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { bucketName, isS3Configured, s3Client } from "../config/s3Client.js";

const ensureS3Configured = () => {
    if (!isS3Configured) {
        const error = new Error("AWS S3 is not configured");
        error.statusCode = 500;
        throw error;
    }
};

const safeFileName = (fileName) => {
    return String(fileName || "document").replace(/[^a-zA-Z0-9._-]/g, "-");
};

export const buildDocumentKey = (garageId, fileName) => {
    return `documents/${garageId}/${Date.now()}-${safeFileName(fileName)}`;
};

export const buildDocumentPublicUrl = (key) => {
    const region = process.env.AWS_REGION || "us-east-1";
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
};

export const uploadDocumentToS3 = async ({ key, buffer, contentType }) => {
    ensureS3Configured();

    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentDisposition: "inline",
    }));

    return {
        key,
        url: buildDocumentPublicUrl(key),
    };
};

export const getDocumentStreamFromS3 = async (key) => {
    ensureS3Configured();

    return s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
    }));
};

export const deleteDocumentFromS3 = async (key) => {
    if (!key || !isS3Configured) {
        return;
    }

    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    }));
};
