-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;
