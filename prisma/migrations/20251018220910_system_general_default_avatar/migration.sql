/*
  Warnings:

  - You are about to drop the column `default_professional_image` on the `SystemGeneralSettings` table. All the data in the column will be lost.
  - You are about to drop the column `default_user_image` on the `SystemGeneralSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemGeneralSettings" DROP COLUMN "default_professional_image",
DROP COLUMN "default_user_image",
ADD COLUMN     "default_image" TEXT;
