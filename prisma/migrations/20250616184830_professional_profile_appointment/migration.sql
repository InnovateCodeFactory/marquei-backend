-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_professional_id_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "professionalProfileId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
