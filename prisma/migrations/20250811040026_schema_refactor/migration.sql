-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Business" DROP CONSTRAINT "Business_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CurrentSelectedBusiness" DROP CONSTRAINT "CurrentSelectedBusiness_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProfessionalProfile" DROP CONSTRAINT "ProfessionalProfile_userId_fkey";

-- DropIndex
DROP INDEX "public"."CurrentSelectedBusiness_userId_key";

-- DropIndex
DROP INDEX "public"."idx_current_selected_business_user";

-- DropIndex
DROP INDEX "public"."idx_professional_user";

-- AlterTable
ALTER TABLE "public"."Appointment" DROP COLUMN "customerId",
ADD COLUMN     "customerProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Business" 
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complement" TEXT,
ADD COLUMN     "neighbourhood" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "uf" TEXT,
ADD COLUMN     "zipCode" TEXT,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."CurrentSelectedBusiness" DROP COLUMN "userId",
ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."ProfessionalProfile" DROP COLUMN "userId",
ADD COLUMN     "personId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Customer";

-- DropTable
DROP TABLE "public"."User";

-- DropEnum
DROP TYPE "public"."UserType";

-- CreateTable
CREATE TABLE "public"."AuthAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "temporary_password" TEXT,
    "first_access" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PersonAccount" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authAccountId" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerProfile" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "birthdate" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "businessId" TEXT,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BusinessContact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_email_key" ON "public"."AuthAccount"("email");

-- CreateIndex
CREATE INDEX "idx_auth_email" ON "public"."AuthAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "public"."Person"("email");

-- CreateIndex
CREATE INDEX "idx_person_email" ON "public"."Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAccount_personId_key" ON "public"."PersonAccount"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonAccount_authAccountId_key" ON "public"."PersonAccount"("authAccountId");

-- CreateIndex
CREATE INDEX "idx_person_account_auth" ON "public"."PersonAccount"("authAccountId");

-- CreateIndex
CREATE INDEX "idx_person_account_person" ON "public"."PersonAccount"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_personId_key" ON "public"."CustomerProfile"("personId");

-- CreateIndex
CREATE INDEX "idx_contact_business" ON "public"."BusinessContact"("businessId");

-- CreateIndex
CREATE INDEX "idx_contact_business_email" ON "public"."BusinessContact"("businessId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessContact_businessId_phone_key" ON "public"."BusinessContact"("businessId", "phone");

-- CreateIndex
CREATE INDEX "idx_customer_profile" ON "public"."Appointment"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentSelectedBusiness_accountId_key" ON "public"."CurrentSelectedBusiness"("accountId");

-- CreateIndex
CREATE INDEX "idx_current_selected_business_account" ON "public"."CurrentSelectedBusiness"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_personId_key" ON "public"."ProfessionalProfile"("personId");

-- AddForeignKey
ALTER TABLE "public"."PersonAccount" ADD CONSTRAINT "PersonAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PersonAccount" ADD CONSTRAINT "PersonAccount_authAccountId_fkey" FOREIGN KEY ("authAccountId") REFERENCES "public"."AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerProfile" ADD CONSTRAINT "CustomerProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerProfile" ADD CONSTRAINT "CustomerProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessContact" ADD CONSTRAINT "BusinessContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessContact" ADD CONSTRAINT "BusinessContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CurrentSelectedBusiness" ADD CONSTRAINT "CurrentSelectedBusiness_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."AuthAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "public"."CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
