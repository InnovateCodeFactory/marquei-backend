-- CreateTable
CREATE TABLE "BusinessAmenity" (
    "businessId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "BusinessAmenity_pkey" PRIMARY KEY ("businessId","amenityId")
);

-- CreateIndex
CREATE INDEX "idx_business_amenity_amenity" ON "BusinessAmenity"("amenityId");

-- CreateIndex
CREATE INDEX "idx_business_amenity_business" ON "BusinessAmenity"("businessId");

-- AddForeignKey
ALTER TABLE "BusinessAmenity" ADD CONSTRAINT "BusinessAmenity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAmenity" ADD CONSTRAINT "BusinessAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
