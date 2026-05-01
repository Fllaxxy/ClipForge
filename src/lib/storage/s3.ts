import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { storageConfig } from "@/lib/config";

let internalClient: S3Client | null = null;
let publicClient: S3Client | null = null;

function buildClient(endpoint?: string) {
  return new S3Client({
    region: storageConfig.region,
    endpoint,
    forcePathStyle: storageConfig.forcePathStyle,
    credentials:
      storageConfig.accessKeyId && storageConfig.secretAccessKey
        ? {
            accessKeyId: storageConfig.accessKeyId,
            secretAccessKey: storageConfig.secretAccessKey
          }
        : undefined
  });
}

export function getS3Client() {
  if (!internalClient) {
    internalClient = buildClient(storageConfig.endpoint);
  }
  return internalClient;
}

function getPublicS3Client() {
  if (!publicClient) {
    publicClient = buildClient(storageConfig.publicEndpoint);
  }
  return publicClient;
}

export function createStorageKey(userId: string, projectId: string, filename: string) {
  return `users/${userId}/projects/${projectId}/${filename}`;
}

export async function uploadBuffer(input: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      Metadata: input.metadata
    })
  );
}

export async function uploadFile(input: {
  key: string;
  filePath: string;
  contentType?: string;
  metadata?: Record<string, string>;
}) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: input.key,
      Body: createReadStream(input.filePath),
      ContentType: input.contentType,
      Metadata: input.metadata
    })
  );
}

export async function downloadToFile(key: string, destination: string) {
  await mkdir(path.dirname(destination), { recursive: true });
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key
    })
  );

  if (!response.Body) {
    throw new Error(`Object ${key} has no body.`);
  }

  await pipeline(response.Body as Readable, createWriteStream(destination));
}

export async function objectExists(key: string) {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: storageConfig.bucket,
        Key: key
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getSignedDownloadUrl(input: {
  key: string;
  filename?: string;
  expiresIn?: number;
  contentType?: string;
}) {
  const command = new GetObjectCommand({
    Bucket: storageConfig.bucket,
    Key: input.key,
    ResponseContentType: input.contentType,
    ResponseContentDisposition: input.filename
      ? `attachment; filename="${input.filename.replace(/"/g, "")}"`
      : undefined
  });

  return getSignedUrl(getPublicS3Client(), command, {
    expiresIn: input.expiresIn ?? 15 * 60
  });
}
