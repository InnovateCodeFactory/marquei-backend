-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('WAITING', 'CONVERTED', 'CANCELED', 'EXPIRED_DAY_PASSED');

-- CreateEnum
CREATE TYPE "WaitlistOfferStatus" AS ENUM ('PENDING', 'CONVERTED', 'EXPIRED', 'DECLINED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "WaitlistEventType" AS ENUM ('JOINED', 'LEFT', 'OFFER_SENT', 'OFFER_EXPIRED', 'OFFER_DECLINED', 'CONVERTED', 'REMOVED_DAY_PASSED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "is_waitlist_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "waitlist_offer_ttl_minutes" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "businessCustomerId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "professionalProfileId" TEXT,
    "serviceId" TEXT,
    "date" DATE NOT NULL,
    "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'WAITING',
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_appointment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistOffer" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "serviceId" TEXT,
    "slot_start_at_utc" TIMESTAMP(3) NOT NULL,
    "slot_end_at_utc" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistOfferStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at_utc" TIMESTAMP(3) NOT NULL,
    "notified_at_utc" TIMESTAMP(3),
    "responded_at_utc" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEvent" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "offerId" TEXT,
    "event_type" "WaitlistEventType" NOT NULL,
    "by_user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_converted_appointment_id_key" ON "WaitlistEntry"("converted_appointment_id");

-- CreateIndex
CREATE INDEX "idx_waitlist_queue" ON "WaitlistEntry"("businessId", "professionalProfileId", "date", "status");

-- CreateIndex
CREATE INDEX "idx_waitlist_person_status" ON "WaitlistEntry"("personId", "status");

-- CreateIndex
CREATE INDEX "idx_waitlist_date_status" ON "WaitlistEntry"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_businessId_personId_date_key" ON "WaitlistEntry"("businessId", "personId", "date");

-- CreateIndex
CREATE INDEX "idx_waitlist_offer_status_expires" ON "WaitlistOffer"("status", "expires_at_utc");

-- CreateIndex
CREATE INDEX "idx_waitlist_offer_entry" ON "WaitlistOffer"("waitlistEntryId");

-- CreateIndex
CREATE INDEX "idx_waitlist_offer_hold" ON "WaitlistOffer"("professionalProfileId", "status", "slot_start_at_utc");

-- CreateIndex
CREATE INDEX "idx_waitlist_event_entry" ON "WaitlistEvent"("waitlistEntryId", "created_at");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_businessCustomerId_fkey" FOREIGN KEY ("businessCustomerId") REFERENCES "BusinessCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_converted_appointment_id_fkey" FOREIGN KEY ("converted_appointment_id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEvent" ADD CONSTRAINT "WaitlistEvent_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEvent" ADD CONSTRAINT "WaitlistEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "WaitlistOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
