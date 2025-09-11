-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- CreateTable
CREATE TABLE "BusinessRating" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BusinessRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_business_rating_business" ON "BusinessRating"("businessId");

-- CreateIndex
CREATE INDEX "idx_business_rating_user" ON "BusinessRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRating_businessId_userId_key" ON "BusinessRating"("businessId", "userId");

-- AddForeignKey
ALTER TABLE "BusinessRating" ADD CONSTRAINT "BusinessRating_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRating" ADD CONSTRAINT "BusinessRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
