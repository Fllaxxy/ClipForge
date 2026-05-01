import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "@prisma/client",
    "bcryptjs",
    "bullmq",
    "ioredis",
    "prisma",
    "stripe"
  ]
};

export default nextConfig;
