-- AlterTable
ALTER TABLE "ProfessionalStatement" ADD COLUMN     "businessId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "idx_professional_statement_profile" ON "ProfessionalStatement"("professionalProfileId");

-- CreateIndex
CREATE INDEX "idx_professional_statement_business" ON "ProfessionalStatement"("businessId");

-- AddForeignKey
ALTER TABLE "ProfessionalStatement" ADD CONSTRAINT "ProfessionalStatement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
