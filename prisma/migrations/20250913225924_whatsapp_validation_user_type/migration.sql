/*
  Warnings:

  - Added the required column `user_type` to the `WhatsAppValidation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "WhatsAppValidation" ADD COLUMN     "user_type" "UserType" NOT NULL;
