-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_favorite_person" ON "Favorite"("personId");

-- CreateIndex
CREATE INDEX "idx_favorite_business" ON "Favorite"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_personId_businessId_key" ON "Favorite"("personId", "businessId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
