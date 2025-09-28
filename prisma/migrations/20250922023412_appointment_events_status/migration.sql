-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentEventType" ADD VALUE 'REMINDER_SENT';
ALTER TYPE "AppointmentEventType" ADD VALUE 'CHECKED_IN';
ALTER TYPE "AppointmentEventType" ADD VALUE 'COMPLETED';
ALTER TYPE "AppointmentEventType" ADD VALUE 'NO_SHOW';
ALTER TYPE "AppointmentEventType" ADD VALUE 'COMPLETED_AUTO';
ALTER TYPE "AppointmentEventType" ADD VALUE 'CANCELED_AUTO';
ALTER TYPE "AppointmentEventType" ADD VALUE 'REMINDER_FAILED';
