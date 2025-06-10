/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- CreateEnum
CREATE TYPE "SubscriptionAction" AS ENUM ('CREATED', 'UPDATED', 'CANCELED', 'RENEWED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stripeProductId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "price_in_cents" INTEGER NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSubscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "businessSubscriptionId" TEXT NOT NULL,
    "action" "SubscriptionAction" NOT NULL,
    "previousPlanId" TEXT,
    "newPlanId" TEXT,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "businessSubscriptionId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amount_paid_in_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripeProductId_key" ON "Plan"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_stripePriceId_key" ON "Plan"("stripePriceId");

-- CreateIndex
CREATE INDEX "Plan_stripeProductId_idx" ON "Plan"("stripeProductId");

-- CreateIndex
CREATE INDEX "Plan_stripePriceId_idx" ON "Plan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_stripeCustomerId_key" ON "BusinessSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "BusinessSubscription_businessId_idx" ON "BusinessSubscription"("businessId");

-- CreateIndex
CREATE INDEX "BusinessSubscription_stripeCustomerId_idx" ON "BusinessSubscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_businessSubscriptionId_idx" ON "SubscriptionHistory"("businessSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeInvoiceId_key" ON "Payment"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "Payment_businessSubscriptionId_idx" ON "Payment"("businessSubscriptionId");

-- CreateIndex
CREATE INDEX "Payment_stripeInvoiceId_idx" ON "Payment"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_event_id_key" ON "WebhookEvent"("event_id");

-- CreateIndex
CREATE INDEX "WebhookEvent_event_id_idx" ON "WebhookEvent"("event_id");

-- CreateIndex
CREATE INDEX "WebhookEvent_type_idx" ON "WebhookEvent"("type");

-- AddForeignKey
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionHistory" ADD CONSTRAINT "SubscriptionHistory_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "BusinessSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_businessSubscriptionId_fkey" FOREIGN KEY ("businessSubscriptionId") REFERENCES "BusinessSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
