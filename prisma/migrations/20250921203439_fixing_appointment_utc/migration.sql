/*
  Warnings:

  - You are about to drop the column `scheduled_at` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `duration_minutes` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_at_utc` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_at_utc` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_offset_minutes` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "idx_professional_date";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "scheduled_at",
ADD COLUMN     "duration_minutes" INTEGER NOT NULL,
ADD COLUMN     "end_at_utc" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_at_utc" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "start_offset_minutes" INTEGER NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- CreateIndex
CREATE INDEX "idx_professional_start" ON "Appointment"("professionalProfileId", "start_at_utc");

-- CreateIndex
CREATE INDEX "idx_professional_end" ON "Appointment"("professionalProfileId", "end_at_utc");
