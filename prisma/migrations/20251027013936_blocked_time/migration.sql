-- CreateTable
CREATE TABLE "ProfessionalTimesBlock" (
    "id" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "start_at_utc" TIMESTAMP(3),
    "end_at_utc" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "start_offset_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalTimesBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_block_professional_start" ON "ProfessionalTimesBlock"("professionalProfileId", "start_at_utc");

-- CreateIndex
CREATE INDEX "idx_block_business" ON "ProfessionalTimesBlock"("businessId");

-- AddForeignKey
ALTER TABLE "ProfessionalTimesBlock" ADD CONSTRAINT "ProfessionalTimesBlock_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalTimesBlock" ADD CONSTRAINT "ProfessionalTimesBlock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
