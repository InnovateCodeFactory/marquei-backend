-- AlterTable
ALTER TABLE "Service" DROP COLUMN "price",
ADD COLUMN     "price_in_cents" INTEGER NOT NULL;
