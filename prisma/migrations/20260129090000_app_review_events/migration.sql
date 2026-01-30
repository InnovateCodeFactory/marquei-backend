-- CreateEnum
CREATE TYPE "AppReviewEventType" AS ENUM ('PROMPT_SHOWN', 'PROMPT_DISMISSED', 'STORE_OPENED');

-- CreateEnum
CREATE TYPE "AppPlatform" AS ENUM ('IOS', 'ANDROID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "app_review_eligible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppReviewEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "platform" "AppPlatform" NOT NULL,
    "app_version" TEXT,
    "event" "AppReviewEventType" NOT NULL,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_app_review_user" ON "AppReviewEvent"("user_id");

-- CreateIndex
CREATE INDEX "idx_app_review_device" ON "AppReviewEvent"("device_id");

-- CreateIndex
CREATE INDEX "idx_app_review_event" ON "AppReviewEvent"("event");

-- CreateIndex
CREATE INDEX "idx_app_review_platform" ON "AppReviewEvent"("platform");

-- CreateIndex
CREATE INDEX "idx_app_review_created" ON "AppReviewEvent"("created_at");

-- AddForeignKey
ALTER TABLE "AppReviewEvent" ADD CONSTRAINT "AppReviewEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
