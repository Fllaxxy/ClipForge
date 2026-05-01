CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
CREATE TYPE "ProjectStatus" AS ENUM ('uploaded', 'processing', 'ready', 'failed');
CREATE TYPE "ProcessingJobType" AS ENUM ('ingest_video', 'extract_audio', 'transcode', 'transcribe', 'detect_clips', 'render_clips');
CREATE TYPE "ProcessingJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');
CREATE TYPE "ClipStatus" AS ENUM ('queued', 'rendering', 'ready', 'failed');
CREATE TYPE "ClipAssetType" AS ENUM ('video', 'thumbnail', 'subtitle', 'transcript', 'audio');
CREATE TYPE "Plan" AS ENUM ('free', 'creator', 'pro');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "ProjectStatus" NOT NULL DEFAULT 'uploaded',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceVideo" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "originalFileUrl" TEXT,
  "storageKey" TEXT NOT NULL,
  "durationSeconds" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "fps" DOUBLE PRECISION,
  "sizeBytes" BIGINT,
  "codec" TEXT,
  "metadataJson" JSONB,
  CONSTRAINT "SourceVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessingJob" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" "ProcessingJobType" NOT NULL,
  "status" "ProcessingJobStatus" NOT NULL DEFAULT 'queued',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "logs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TranscriptSegment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "startMs" INTEGER NOT NULL,
  "endMs" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Clip" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "hook" TEXT NOT NULL,
  "description" TEXT,
  "startMs" INTEGER NOT NULL,
  "endMs" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "viralScore" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ClipStatus" NOT NULL DEFAULT 'queued',
  "outputUrl" TEXT,
  "thumbnailUrl" TEXT,
  "captionStyleJson" JSONB,
  "cropJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClipAsset" (
  "id" TEXT NOT NULL,
  "clipId" TEXT NOT NULL,
  "type" "ClipAssetType" NOT NULL,
  "url" TEXT,
  "storageKey" TEXT NOT NULL,
  "metadataJson" JSONB,
  CONSTRAINT "ClipAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "plan" "Plan" NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE UNIQUE INDEX "SourceVideo_projectId_key" ON "SourceVideo"("projectId");
CREATE INDEX "ProcessingJob_projectId_createdAt_idx" ON "ProcessingJob"("projectId", "createdAt");
CREATE INDEX "ProcessingJob_status_type_idx" ON "ProcessingJob"("status", "type");
CREATE INDEX "TranscriptSegment_projectId_startMs_idx" ON "TranscriptSegment"("projectId", "startMs");
CREATE INDEX "Clip_projectId_viralScore_idx" ON "Clip"("projectId", "viralScore");
CREATE INDEX "Clip_status_idx" ON "Clip"("status");
CREATE INDEX "ClipAsset_clipId_type_idx" ON "ClipAsset"("clipId", "type");
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "UsageLedger_userId_createdAt_idx" ON "UsageLedger"("userId", "createdAt");
CREATE INDEX "UsageLedger_projectId_idx" ON "UsageLedger"("projectId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceVideo" ADD CONSTRAINT "SourceVideo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClipAsset" ADD CONSTRAINT "ClipAsset_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageLedger" ADD CONSTRAINT "UsageLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageLedger" ADD CONSTRAINT "UsageLedger_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
