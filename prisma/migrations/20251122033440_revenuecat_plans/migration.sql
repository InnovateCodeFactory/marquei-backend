/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `BusinessSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `BusinessSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `stripeProductId` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the `PlanBenefit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[plan_id]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PlanBenefit" DROP CONSTRAINT "PlanBenefit_planId_fkey";

-- DropIndex
DROP INDEX "BusinessSubscription_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "Payment_stripeInvoiceId_idx";

-- DropIndex
DROP INDEX "Payment_stripeInvoiceId_key";

-- DropIndex
DROP INDEX "Plan_stripePriceId_idx";

-- DropIndex
DROP INDEX "Plan_stripePriceId_key";

-- DropIndex
DROP INDEX "Plan_stripeProductId_idx";

-- AlterTable
ALTER TABLE "BusinessSubscription" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "stripeInvoiceId";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "stripePriceId",
DROP COLUMN "stripeProductId",
ADD COLUMN     "max_professionals_allowed" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plan_id" TEXT NOT NULL DEFAULT 'free_trial';

-- DropTable
DROP TABLE "PlanBenefit";

-- CreateIndex
CREATE UNIQUE INDEX "Plan_plan_id_key" ON "Plan"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_id" ON "Plan"("plan_id");
