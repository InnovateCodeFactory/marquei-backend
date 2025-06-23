/*
  Warnings:

  - The values [WHATSAPP_INTEGRATION,REPORT_LEVEL,WHATSAPP_NOTIFICATIONS,EMAIL_NOTIFICATIONS] on the enum `BenefitKey` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BenefitKey_new" AS ENUM ('PROFESSIONALS', 'REMINDER_CHANNELS', 'CONFIRMATION_ENABLED', 'WAITING_LIST_ENABLED', 'REVIEW_REQUEST_ENABLED', 'APP_POSITION');
ALTER TABLE "PlanBenefit" ALTER COLUMN "key" TYPE "BenefitKey_new" USING ("key"::text::"BenefitKey_new");
ALTER TYPE "BenefitKey" RENAME TO "BenefitKey_old";
ALTER TYPE "BenefitKey_new" RENAME TO "BenefitKey";
DROP TYPE "BenefitKey_old";
COMMIT;
