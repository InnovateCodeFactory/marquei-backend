CREATE TABLE "ProfessionalServiceCombo" (
    "id" TEXT NOT NULL,
    "professional_profile_id" TEXT NOT NULL,
    "service_combo_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER,

    CONSTRAINT "ProfessionalServiceCombo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_professional_service_combo_profile_combo" ON "ProfessionalServiceCombo"("professional_profile_id", "service_combo_id");

CREATE INDEX "idx_prof_service_combo_profile" ON "ProfessionalServiceCombo"("professional_profile_id");

CREATE INDEX "idx_prof_service_combo_combo" ON "ProfessionalServiceCombo"("service_combo_id");

ALTER TABLE "ProfessionalServiceCombo" ADD CONSTRAINT "ProfessionalServiceCombo_professional_profile_id_fkey" FOREIGN KEY ("professional_profile_id") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProfessionalServiceCombo" ADD CONSTRAINT "ProfessionalServiceCombo_service_combo_id_fkey" FOREIGN KEY ("service_combo_id") REFERENCES "ServiceCombo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
