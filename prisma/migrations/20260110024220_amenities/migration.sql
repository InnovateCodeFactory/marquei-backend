-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('wifi', 'parking', 'free_parking', 'air_conditioning', 'climatized_environment', 'accessibility', 'bathroom', 'accessible_bathroom', 'waiting_room', 'tv', 'ambient_music', 'coffee', 'water', 'drinks', 'pet_friendly', 'kids_area', 'card_payment', 'pix_payment', 'cash_payment', 'male_service', 'female_service', 'kids_service', 'certified_professionals', 'products_for_sale', 'private_environment');

-- CreateTable
CREATE TABLE "Amenities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AmenityType" NOT NULL,
    "icon" TEXT NOT NULL,
    "lib" TEXT NOT NULL,

    CONSTRAINT "Amenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenities_type_key" ON "Amenities"("type");
