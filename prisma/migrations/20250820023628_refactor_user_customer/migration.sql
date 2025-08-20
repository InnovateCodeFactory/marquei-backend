-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_businessId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Appointment" DROP COLUMN "customerId",
ADD COLUMN     "personId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "personId" TEXT;

-- DropTable
DROP TABLE "public"."Customer";

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "document_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "birthdate" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BusinessCustomer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_document_number_key" ON "public"."Person"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "public"."Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_phone_key" ON "public"."Person"("phone");

-- CreateIndex
CREATE INDEX "idx_person_email" ON "public"."Person"("email");

-- CreateIndex
CREATE INDEX "idx_bc_business" ON "public"."BusinessCustomer"("businessId");

-- CreateIndex
CREATE INDEX "idx_bc_person" ON "public"."BusinessCustomer"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCustomer_businessId_personId_key" ON "public"."BusinessCustomer"("businessId", "personId");

-- CreateIndex
CREATE INDEX "idx_appointment_person" ON "public"."Appointment"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "public"."User"("personId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessCustomer" ADD CONSTRAINT "BusinessCustomer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
