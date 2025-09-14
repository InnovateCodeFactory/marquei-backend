/*
  Warnings:

  - You are about to drop the column `code` on the `MailValidation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[request_id]` on the table `MailValidation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code_ciphertext` to the `MailValidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code_iv` to the `MailValidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `request_id` to the `MailValidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_type` to the `MailValidation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmailValidationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'VALIDATED');

-- CreateEnum
CREATE TYPE "EmailValidationEventType" AS ENUM ('CREATED', 'SENT_REQUEST', 'DELIVERY_CONFIRMED', 'VALIDATION_ATTEMPT', 'VALIDATION_SUCCESS', 'VALIDATION_FAILED', 'EXPIRED', 'BLOCKED', 'SYSTEM_ERROR');

-- DropIndex
DROP INDEX "idx_mail_validation_code";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "MailValidation" DROP COLUMN "code",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "code_ciphertext" TEXT NOT NULL,
ADD COLUMN     "code_iv" TEXT NOT NULL,
ADD COLUMN     "request_id" TEXT NOT NULL,
ADD COLUMN     "status" "EmailValidationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "user_type" "UserType" NOT NULL;

-- CreateTable
CREATE TABLE "MailValidationEvent" (
    "id" TEXT NOT NULL,
    "mailValidationId" TEXT NOT NULL,
    "event_type" "EmailValidationEventType" NOT NULL,
    "message" VARCHAR(255),
    "code_ciphertext" TEXT NOT NULL,
    "code_iv" TEXT NOT NULL,
    "attempt_no" INTEGER,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailValidationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_mail_event_stream" ON "MailValidationEvent"("mailValidationId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "MailValidation_request_id_key" ON "MailValidation"("request_id");

-- CreateIndex
CREATE INDEX "idx_mail_validation_request" ON "MailValidation"("request_id");

-- AddForeignKey
ALTER TABLE "MailValidationEvent" ADD CONSTRAINT "MailValidationEvent_mailValidationId_fkey" FOREIGN KEY ("mailValidationId") REFERENCES "MailValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
