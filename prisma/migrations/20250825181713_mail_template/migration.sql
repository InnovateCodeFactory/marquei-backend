/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MailTemplateType" AS ENUM ('WELCOME', 'VALIDATION_CODE', 'PASSWORD_RESET', 'APPOINTMENT_CONFIRMATION', 'APPOINTMENT_REMINDER');



-- CreateTable
CREATE TABLE "MailTemplate" (
    "id" TEXT NOT NULL,
    "type" "MailTemplateType" NOT NULL,
    "subject" TEXT NOT NULL,
    "pre_header" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailTemplate_type_active_key" ON "MailTemplate"("type", "active");
