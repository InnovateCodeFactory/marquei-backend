-- CreateEnum
CREATE TYPE "ServiceComboPricingMode" AS ENUM ('FIXED_PRICE', 'PERCENT_DISCOUNT');

-- CreateEnum
CREATE TYPE "ServiceComboDurationMode" AS ENUM ('SUM_SERVICES', 'CUSTOM');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "combo_snapshot" JSONB,
ADD COLUMN     "serviceComboId" TEXT;

-- AlterTable
ALTER TABLE "ProfessionalStatement" ADD COLUMN     "combo_services_snapshot" JSONB,
ADD COLUMN     "is_combo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceComboId" TEXT;

-- CreateTable
CREATE TABLE "ServiceCombo" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4647fa',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "pricing_mode" "ServiceComboPricingMode" NOT NULL,
    "duration_mode" "ServiceComboDurationMode" NOT NULL,
    "discount_percent" DOUBLE PRECISION,
    "fixed_price_in_cents" INTEGER,
    "custom_duration_minutes" INTEGER,
    "base_price_in_cents" INTEGER NOT NULL,
    "base_duration_minutes" INTEGER NOT NULL,
    "final_price_in_cents" INTEGER NOT NULL,
    "final_duration_minutes" INTEGER NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "price_in_cents_snapshot" INTEGER NOT NULL,
    "duration_minutes_snapshot" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_service_combo_business" ON "ServiceCombo"("businessId");

-- CreateIndex
CREATE INDEX "idx_service_combo_business_active" ON "ServiceCombo"("businessId", "is_active");

-- CreateIndex
CREATE INDEX "idx_service_combo_business_name" ON "ServiceCombo"("businessId", "name");

-- CreateIndex
CREATE INDEX "idx_service_combo_deleted_at" ON "ServiceCombo"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_service_combo_created_by" ON "ServiceCombo"("created_by_user_id");

-- CreateIndex
CREATE INDEX "idx_service_combo_item_combo_order" ON "ServiceComboItem"("comboId", "sort_order");

-- CreateIndex
CREATE INDEX "idx_service_combo_item_service" ON "ServiceComboItem"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceComboItem_comboId_serviceId_key" ON "ServiceComboItem"("comboId", "serviceId");

-- CreateIndex
CREATE INDEX "idx_appointment_service_combo" ON "Appointment"("serviceComboId");

-- CreateIndex
CREATE INDEX "idx_professional_statement_service_combo" ON "ProfessionalStatement"("serviceComboId");

-- AddForeignKey
ALTER TABLE "ProfessionalStatement" ADD CONSTRAINT "ProfessionalStatement_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCombo" ADD CONSTRAINT "ServiceCombo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCombo" ADD CONSTRAINT "ServiceCombo_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCombo" ADD CONSTRAINT "ServiceCombo_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceComboItem" ADD CONSTRAINT "ServiceComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "ServiceCombo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceComboItem" ADD CONSTRAINT "ServiceComboItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
