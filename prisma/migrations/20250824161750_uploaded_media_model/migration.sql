-- CreateEnum
CREATE TYPE "public"."UploadedMediaSource" AS ENUM ('BUSINESS_LOGO', 'BUSINESS_COVER', 'PROFESSIONAL_AVATAR', 'CUSTOMER_AVATAR', 'SERVICE_IMAGE');

-- CreateTable
CREATE TABLE "public"."UploadedMedia" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "etag" TEXT,
    "source" "public"."UploadedMediaSource" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UploadedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UploadedMedia_key_key" ON "public"."UploadedMedia"("key");

-- CreateIndex
CREATE INDEX "idx_uploaded_media_source" ON "public"."UploadedMedia"("source");

-- CreateIndex
CREATE INDEX "idx_uploaded_media_user" ON "public"."UploadedMedia"("userId");

-- AddForeignKey
ALTER TABLE "public"."UploadedMedia" ADD CONSTRAINT "UploadedMedia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
