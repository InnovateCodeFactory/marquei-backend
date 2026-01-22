-- CreateTable
CREATE TABLE "BusinessRatingPrompt" (
    "id" TEXT NOT NULL,
    "business_slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRatingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_rating_prompt_business_user" ON "BusinessRatingPrompt"("business_slug", "userId");

-- CreateIndex
CREATE INDEX "idx_rating_prompt_business" ON "BusinessRatingPrompt"("business_slug");

-- CreateIndex
CREATE INDEX "idx_rating_prompt_user" ON "BusinessRatingPrompt"("userId");

-- AddForeignKey
ALTER TABLE "BusinessRatingPrompt" ADD CONSTRAINT "BusinessRatingPrompt_business_slug_fkey" FOREIGN KEY ("business_slug") REFERENCES "Business"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessRatingPrompt" ADD CONSTRAINT "BusinessRatingPrompt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
