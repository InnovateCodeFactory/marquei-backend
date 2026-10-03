-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessReminderType" ADD VALUE 'PLAN_LAST_APPOINTMENT';
ALTER TYPE "BusinessReminderType" ADD VALUE 'PLAN_CYCLE_ENDING';

-- AlterTable
ALTER TABLE "ReminderJob" ADD COLUMN     "customerPlanSubscriptionId" TEXT,
ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "type" "BusinessReminderType" NOT NULL DEFAULT 'APPOINTMENT_REMINDER',
ALTER COLUMN "appointmentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_job_type_status_due" ON "ReminderJob"("type", "status", "due_at_utc");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderJob_customerPlanSubscriptionId_cycleId_type_channel_key" ON "ReminderJob"("customerPlanSubscriptionId", "cycleId", "type", "channel");

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_customerPlanSubscriptionId_fkey" FOREIGN KEY ("customerPlanSubscriptionId") REFERENCES "CustomerPlanSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CustomerServicePlanCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
