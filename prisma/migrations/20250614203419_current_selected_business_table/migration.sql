-- AlterTable
ALTER TABLE "User" DROP COLUMN "current_selected_business_slug";

-- CreateTable
CREATE TABLE "CurrentSelectedBusiness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "CurrentSelectedBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrentSelectedBusiness_userId_key" ON "CurrentSelectedBusiness"("userId");

-- CreateIndex
CREATE INDEX "idx_current_selected_business_user" ON "CurrentSelectedBusiness"("userId");

-- CreateIndex
CREATE INDEX "idx_current_selected_business_business" ON "CurrentSelectedBusiness"("businessId");

-- AddForeignKey
ALTER TABLE "CurrentSelectedBusiness" ADD CONSTRAINT "CurrentSelectedBusiness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentSelectedBusiness" ADD CONSTRAINT "CurrentSelectedBusiness_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
