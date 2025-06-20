/*
  Warnings:

  - You are about to drop the column `isActive` on the `ProfessionalProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- AlterTable
ALTER TABLE "ProfessionalProfile" DROP COLUMN "isActive",
ADD COLUMN     "status" "ProfessionalStatus" NOT NULL DEFAULT 'ACTIVE';
