-- AlterTable
ALTER TABLE "BusinessCategory" ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "idx_business_name" ON "Business"("name");
