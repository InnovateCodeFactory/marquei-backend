-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "events" JSONB NOT NULL DEFAULT '[]'::jsonb;
