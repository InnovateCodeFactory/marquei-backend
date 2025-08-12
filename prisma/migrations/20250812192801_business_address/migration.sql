/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Business" 
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "neighbourhood" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "uf" TEXT,
ADD COLUMN     "zipCode" TEXT;
