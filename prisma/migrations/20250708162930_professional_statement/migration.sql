-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('INCOME', 'OUTCOME');

-- CreateTable
CREATE TABLE "ProfessionalStatement" (
    "id" TEXT NOT NULL,
    "type" "StatementType" NOT NULL,
    "description" TEXT NOT NULL,
    "value_in_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "professionalProfileId" TEXT NOT NULL,
    "appointmentId" TEXT,

    CONSTRAINT "ProfessionalStatement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProfessionalStatement" ADD CONSTRAINT "ProfessionalStatement_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalStatement" ADD CONSTRAINT "ProfessionalStatement_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
