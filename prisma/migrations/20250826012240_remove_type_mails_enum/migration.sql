/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.
  - Changed the type of `type` on the `MailTemplate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `MailValidation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/

-- AlterTable
ALTER TABLE "MailTemplate" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MailValidation" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- DropEnum
DROP TYPE "MailTemplateType";

-- CreateIndex
CREATE UNIQUE INDEX "MailTemplate_type_active_key" ON "MailTemplate"("type", "active");
