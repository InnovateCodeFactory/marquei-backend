/*
  Warnings:

  - You are about to drop the column `events` on the `Appointment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AppointmentEventType" AS ENUM ('CREATED', 'RESCHEDULED', 'CANCELED', 'CONFIRMED');

-- DropForeignKey
ALTER TABLE "MailValidationEvent" DROP CONSTRAINT "MailValidationEvent_mailValidationId_fkey";

-- DropForeignKey
ALTER TABLE "WhatsAppValidationEvent" DROP CONSTRAINT "WhatsAppValidationEvent_whatsAppValidationId_fkey";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "events";

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "event_type" "AppointmentEventType" NOT NULL,
    "by_professional" BOOLEAN NOT NULL,
    "by_user_id" TEXT NOT NULL,
    "reason" TEXT,
    "ip" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_appointment_event_appointment" ON "AppointmentEvent"("appointmentId");

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailValidationEvent" ADD CONSTRAINT "MailValidationEvent_mailValidationId_fkey" FOREIGN KEY ("mailValidationId") REFERENCES "MailValidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppValidationEvent" ADD CONSTRAINT "WhatsAppValidationEvent_whatsAppValidationId_fkey" FOREIGN KEY ("whatsAppValidationId") REFERENCES "WhatsAppValidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
