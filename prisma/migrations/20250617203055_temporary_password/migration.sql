-- AlterTable
ALTER TABLE "User" ADD COLUMN     "first_access" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "temporary_password" TEXT;
