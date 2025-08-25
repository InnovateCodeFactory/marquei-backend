/*
  Warnings:

  - The values [WELCOME] on the enum `MailTemplateType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MailTemplateType_new" AS ENUM ('WELCOME_PROFESSIONAL', 'WELCOME_CUSTOMER', 'VALIDATION_CODE', 'PASSWORD_RESET', 'APPOINTMENT_CONFIRMATION', 'APPOINTMENT_REMINDER', 'APPOINTMENT_CANCELLATION');
ALTER TABLE "MailTemplate" ALTER COLUMN "type" TYPE "MailTemplateType_new" USING ("type"::text::"MailTemplateType_new");
ALTER TABLE "MailValidation" ALTER COLUMN "type" TYPE "MailTemplateType_new" USING ("type"::text::"MailTemplateType_new");
ALTER TYPE "MailTemplateType" RENAME TO "MailTemplateType_old";
ALTER TYPE "MailTemplateType_new" RENAME TO "MailTemplateType";
DROP TYPE "MailTemplateType_old";
COMMIT;
