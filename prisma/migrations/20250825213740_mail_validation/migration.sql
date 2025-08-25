/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/


-- CreateTable
CREATE TABLE "MailValidation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "MailTemplateType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_mail_validation_email" ON "MailValidation"("email");

-- CreateIndex
CREATE INDEX "idx_mail_validation_code" ON "MailValidation"("code");
