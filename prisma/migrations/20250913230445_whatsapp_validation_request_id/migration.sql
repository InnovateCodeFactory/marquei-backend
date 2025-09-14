/*
  Warnings:

  - A unique constraint covering the columns `[request_id]` on the table `WhatsAppValidation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `request_id` to the `WhatsAppValidation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "WhatsAppValidation" ADD COLUMN     "request_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppValidation_request_id_key" ON "WhatsAppValidation"("request_id");

-- CreateIndex
CREATE INDEX "idx_whatsapp_validation_request" ON "WhatsAppValidation"("request_id");
