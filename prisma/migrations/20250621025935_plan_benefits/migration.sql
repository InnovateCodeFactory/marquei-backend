-- CreateEnum
CREATE TYPE "BenefitKey" AS ENUM ('PROFESSIONALS', 'WHATSAPP_INTEGRATION', 'REPORT_LEVEL', 'WHATSAPP_NOTIFICATIONS', 'EMAIL_NOTIFICATIONS');

-- CreateTable
CREATE TABLE "PlanBenefit" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" "BenefitKey" NOT NULL,
    "order" INTEGER,
    "stringValue" TEXT,
    "intValue" INTEGER,
    "boolValue" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanBenefit_planId_idx" ON "PlanBenefit"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanBenefit_planId_key_key" ON "PlanBenefit"("planId", "key");

-- AddForeignKey
ALTER TABLE "PlanBenefit" ADD CONSTRAINT "PlanBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
