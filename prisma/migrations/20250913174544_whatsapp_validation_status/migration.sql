-- CreateEnum
CREATE TYPE "WhatsAppValidationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'VALIDATED');

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "WhatsAppValidation" ADD COLUMN     "status" "WhatsAppValidationStatus" NOT NULL DEFAULT 'PENDING';
