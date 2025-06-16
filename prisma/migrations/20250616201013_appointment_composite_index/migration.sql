-- DropIndex
DROP INDEX "idx_appointment_scheduled";

-- CreateIndex
CREATE INDEX "idx_professional_date" ON "Appointment"("professionalProfileId", "scheduled_at");
