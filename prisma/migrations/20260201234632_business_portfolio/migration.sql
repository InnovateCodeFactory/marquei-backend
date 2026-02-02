-- CreateTable
CREATE TABLE "BusinessPortfolioFolder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "BusinessPortfolioFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPortfolioItem" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "folderId" TEXT,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_portfolio_folder_business" ON "BusinessPortfolioFolder"("businessId");

-- CreateIndex
CREATE INDEX "idx_portfolio_folder_created_by" ON "BusinessPortfolioFolder"("createdById");

-- CreateIndex
CREATE INDEX "idx_portfolio_folder_name" ON "BusinessPortfolioFolder"("name");

-- CreateIndex
CREATE INDEX "idx_portfolio_item_business" ON "BusinessPortfolioItem"("businessId");

-- CreateIndex
CREATE INDEX "idx_portfolio_item_folder" ON "BusinessPortfolioItem"("folderId");

-- CreateIndex
CREATE INDEX "idx_portfolio_item_uploaded_by" ON "BusinessPortfolioItem"("uploadedById");

-- AddForeignKey
ALTER TABLE "BusinessPortfolioFolder" ADD CONSTRAINT "BusinessPortfolioFolder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPortfolioFolder" ADD CONSTRAINT "BusinessPortfolioFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPortfolioItem" ADD CONSTRAINT "BusinessPortfolioItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPortfolioItem" ADD CONSTRAINT "BusinessPortfolioItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "BusinessPortfolioFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPortfolioItem" ADD CONSTRAINT "BusinessPortfolioItem_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
