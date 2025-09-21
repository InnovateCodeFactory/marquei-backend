/*
  Warnings:

  - You are about to drop the column `app_store_url` on the `SystemGeneralSettings` table. All the data in the column will be lost.
  - You are about to drop the column `play_store_url` on the `SystemGeneralSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemGeneralSettings" DROP COLUMN "app_store_url",
DROP COLUMN "play_store_url",
ADD COLUMN     "marquei_app_store_url" TEXT,
ADD COLUMN     "marquei_play_store_url" TEXT,
ADD COLUMN     "marquei_pro_app_store_url" TEXT,
ADD COLUMN     "marquei_pro_play_store_url" TEXT;
