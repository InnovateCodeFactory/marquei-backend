-- CreateEnum
CREATE TYPE "GuestOrigin" AS ENUM ('APP', 'WEB');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "origin" "GuestOrigin" NOT NULL DEFAULT 'APP';
