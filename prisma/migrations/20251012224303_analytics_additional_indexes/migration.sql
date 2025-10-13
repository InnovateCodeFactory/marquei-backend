-- CreateIndex
CREATE INDEX "idx_bc_business_created_at" ON "BusinessCustomer"("businessId", "created_at");

-- CreateIndex
CREATE INDEX "idx_professional_business_id" ON "ProfessionalProfile"("business_id", "id");

-- CreateIndex
CREATE INDEX "idx_ps_business_type_created_at" ON "ProfessionalStatement"("businessId", "type", "created_at");
