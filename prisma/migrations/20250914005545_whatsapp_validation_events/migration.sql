/*
  Warnings:

  - You are about to drop the column `code` on the `WhatsAppValidation` table. All the data in the column will be lost.
  - Added the required column `code_ciphertext` to the `WhatsAppValidation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code_iv` to the `WhatsAppValidation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WhatsAppValidationEventType" AS ENUM ('CREATED', 'SENT_REQUEST', 'DELIVERY_CONFIRMED', 'VALIDATION_ATTEMPT', 'VALIDATION_SUCCESS', 'VALIDATION_FAILED', 'EXPIRED', 'BLOCKED', 'SYSTEM_ERROR');

-- DropIndex
DROP INDEX "idx_whatsapp_validation_code";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "WhatsAppValidation" DROP COLUMN "code",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "code_ciphertext" TEXT NOT NULL,
ADD COLUMN     "code_iv" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WhatsAppValidationEvent" (
    "id" TEXT NOT NULL,
    "whatsAppValidationId" TEXT NOT NULL,
    "event_type" "WhatsAppValidationEventType" NOT NULL,
    "message" VARCHAR(255),
    "code_ciphertext" TEXT NOT NULL,
    "code_iv" TEXT NOT NULL,
    "attempt_no" INTEGER,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppValidationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_wv_event_stream" ON "WhatsAppValidationEvent"("whatsAppValidationId", "created_at");

-- AddForeignKey
ALTER TABLE "WhatsAppValidationEvent" ADD CONSTRAINT "WhatsAppValidationEvent_whatsAppValidationId_fkey" FOREIGN KEY ("whatsAppValidationId") REFERENCES "WhatsAppValidation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
