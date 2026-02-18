-- CreateEnum
CREATE TYPE "BusinessReminderType" AS ENUM ('APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION_REQUEST');

-- AlterTable
ALTER TABLE "BusinessReminderSettings"
ADD COLUMN "type" "BusinessReminderType" NOT NULL DEFAULT 'APPOINTMENT_REMINDER',
ADD COLUMN "message_template" TEXT;

-- Remove old uniqueness by business (now it is business + type)
DROP INDEX IF EXISTS "BusinessReminderSettings_businessId_key";

-- Backfill reminder template in existing rows
UPDATE "BusinessReminderSettings"
SET "message_template" = COALESCE(
  "reminder_template",
  'Lembrete: você tem um agendamento de {{service_name}} com {{professional_name}} {{day_with_preposition}} às {{time}}.'
)
WHERE "type" = 'APPOINTMENT_REMINDER';

-- Create confirmation-request row per business
INSERT INTO "BusinessReminderSettings" (
  "id",
  "businessId",
  "type",
  "offsets_min_before",
  "channels",
  "timezone",
  "is_active",
  "message_template",
  "created_at",
  "updated_at"
)
SELECT
  CONCAT('brs_', md5(random()::text || clock_timestamp()::text || brs."businessId")),
  brs."businessId",
  'APPOINTMENT_CONFIRMATION_REQUEST'::"BusinessReminderType",
  ARRAY[]::INTEGER[],
  ARRAY['WHATSAPP']::"ReminderChannel"[],
  COALESCE(brs."timezone", 'America/Sao_Paulo'),
  COALESCE(brs."is_active", true),
  COALESCE(
    brs."confirmation_request_template",
    '{{business_name}}\n\nOlá! Tudo bem? 😊\n\nO profissional {{professional_name}} solicita a confirmação do seu agendamento de *{{service_name}}* para {{day_with_preposition}}, às {{time}}.'
  ),
  NOW(),
  NOW()
FROM "BusinessReminderSettings" brs
WHERE brs."type" = 'APPOINTMENT_REMINDER';

-- Drop deprecated columns
ALTER TABLE "BusinessReminderSettings"
DROP COLUMN "reminder_template",
DROP COLUMN "confirmation_request_template";

-- Make new message field required
ALTER TABLE "BusinessReminderSettings"
ALTER COLUMN "message_template" SET NOT NULL,
ALTER COLUMN "type" DROP DEFAULT;

-- New uniqueness by business + type
CREATE UNIQUE INDEX "uq_business_reminder_settings_business_type"
ON "BusinessReminderSettings"("businessId", "type");
