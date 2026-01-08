-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "is_test" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "idx_business_is_test" ON "Business"("is_test");

-- CreateIndex
CREATE INDEX "idx_business_is_active" ON "Business"("is_active");
