/*
  Warnings:

  - You are about to drop the column `businessId` on the `BusinessRating` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[business_slug,userId]` on the table `BusinessRating` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `business_slug` to the `BusinessRating` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BusinessRating" DROP CONSTRAINT "BusinessRating_businessId_fkey";

-- DropIndex
DROP INDEX "BusinessRating_businessId_userId_key";

-- DropIndex
DROP INDEX "idx_business_rating_business";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "BusinessRating" DROP COLUMN "businessId",
ADD COLUMN     "business_slug" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "idx_business_rating_business" ON "BusinessRating"("business_slug");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRating_business_slug_userId_key" ON "BusinessRating"("business_slug", "userId");

-- AddForeignKey
ALTER TABLE "BusinessRating" ADD CONSTRAINT "BusinessRating_business_slug_fkey" FOREIGN KEY ("business_slug") REFERENCES "Business"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
