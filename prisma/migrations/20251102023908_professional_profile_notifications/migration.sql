-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "email_notification_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "push_notification_enabled" BOOLEAN NOT NULL DEFAULT true;
