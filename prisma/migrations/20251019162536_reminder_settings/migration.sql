-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('PUSH', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "ReminderJobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'FAILED', 'CANCELED', 'SKIPPED');

-- CreateTable
CREATE TABLE "BusinessReminderSettings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "offsets_min_before" INTEGER[] DEFAULT ARRAY[1440, 60]::INTEGER[],
    "channels" "ReminderChannel"[] DEFAULT ARRAY['PUSH']::"ReminderChannel"[],
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderJob" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "due_at_utc" TIMESTAMP(3) NOT NULL,
    "scheduled_at_utc" TIMESTAMP(3),
    "sent_at_utc" TIMESTAMP(3),
    "status" "ReminderJobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessReminderSettings_businessId_key" ON "BusinessReminderSettings"("businessId");

-- CreateIndex
CREATE INDEX "idx_job_status_due" ON "ReminderJob"("status", "due_at_utc");

-- CreateIndex
CREATE INDEX "idx_job_business" ON "ReminderJob"("businessId");

-- CreateIndex
CREATE INDEX "idx_job_appointment" ON "ReminderJob"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderJob_appointmentId_channel_due_at_utc_key" ON "ReminderJob"("appointmentId", "channel", "due_at_utc");

-- AddForeignKey
ALTER TABLE "BusinessReminderSettings" ADD CONSTRAINT "BusinessReminderSettings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderJob" ADD CONSTRAINT "ReminderJob_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
