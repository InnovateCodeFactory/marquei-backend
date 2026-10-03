-- Customer service plans and recurring appointments.

CREATE TYPE "CustomerServicePlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "CustomerServicePlanCycleType" AS ENUM ('CALENDAR_MONTH', 'ROLLING_FROM_START');
CREATE TYPE "CustomerPlanSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED');
CREATE TYPE "AppointmentPlanRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'REFUNDED');
CREATE TYPE "RecurringAppointmentSeriesStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'COMPLETED');
CREATE TYPE "RecurringAppointmentFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');
CREATE TYPE "RecurringAppointmentOccurrenceStatus" AS ENUM ('CREATED', 'SKIPPED_CONFLICT', 'SKIPPED_NO_CREDIT', 'SKIPPED_OUT_OF_CYCLE', 'CANCELED');

ALTER TABLE "ProfessionalStatement"
  ADD COLUMN "customerPlanSubscriptionId" TEXT;

CREATE TABLE "CustomerServicePlan" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_in_cents" INTEGER NOT NULL,
  "cycle_type" "CustomerServicePlanCycleType" NOT NULL DEFAULT 'ROLLING_FROM_START',
  "cycle_interval_months" INTEGER NOT NULL DEFAULT 1,
  "credits_per_cycle" INTEGER NOT NULL,
  "max_uses_per_week" INTEGER NOT NULL DEFAULT 1,
  "allow_multiple_uses_same_week" BOOLEAN NOT NULL DEFAULT false,
  "min_days_between_uses" INTEGER NOT NULL DEFAULT 0,
  "max_future_bookings" INTEGER NOT NULL,
  "booking_window_days" INTEGER NOT NULL DEFAULT 31,
  "allow_client_recurring_booking" BOOLEAN NOT NULL DEFAULT true,
  "allow_client_single_booking" BOOLEAN NOT NULL DEFAULT true,
  "status" "CustomerServicePlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" TEXT NOT NULL,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerServicePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerServicePlanService" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerServicePlanService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerServicePlanCombo" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "serviceComboId" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerServicePlanCombo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerPlanSubscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessCustomerId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "CustomerPlanSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "current_cycle_start" TIMESTAMP(3) NOT NULL,
  "current_cycle_end" TIMESTAMP(3) NOT NULL,
  "price_in_cents_snapshot" INTEGER NOT NULL,
  "credits_per_cycle_snapshot" INTEGER NOT NULL,
  "rules_snapshot" JSONB NOT NULL,
  "sold_by_user_id" TEXT NOT NULL,
  "revenue_professional_profile_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPlanSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerServicePlanCycle" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "cycle_start" TIMESTAMP(3) NOT NULL,
  "cycle_end" TIMESTAMP(3) NOT NULL,
  "credits_granted" INTEGER NOT NULL,
  "credits_reserved" INTEGER NOT NULL DEFAULT 0,
  "credits_consumed" INTEGER NOT NULL DEFAULT 0,
  "credits_refunded" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerServicePlanCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentPlanRedemption" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "status" "AppointmentPlanRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumed_at" TIMESTAMP(3),
  "refunded_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppointmentPlanRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringAppointmentSeries" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessCustomerId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "professionalProfileId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "serviceComboId" TEXT,
  "planSubscriptionId" TEXT,
  "status" "RecurringAppointmentSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
  "frequency" "RecurringAppointmentFrequency" NOT NULL DEFAULT 'WEEKLY',
  "weekday" INTEGER,
  "day_of_month" INTEGER,
  "time" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3),
  "max_occurrences" INTEGER,
  "generated_until" TIMESTAMP(3),
  "created_by_user_id" TEXT NOT NULL,
  "created_by_user_type" "UserType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringAppointmentSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringAppointmentOccurrence" (
  "id" TEXT NOT NULL,
  "seriesId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "scheduled_start_at_utc" TIMESTAMP(3) NOT NULL,
  "status" "RecurringAppointmentOccurrenceStatus" NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringAppointmentOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_customer_service_plan_business_status" ON "CustomerServicePlan"("businessId", "status");
CREATE INDEX "idx_customer_service_plan_business_name" ON "CustomerServicePlan"("businessId", "name");
CREATE INDEX "idx_customer_service_plan_created_by" ON "CustomerServicePlan"("created_by_user_id");

CREATE UNIQUE INDEX "uq_customer_plan_service" ON "CustomerServicePlanService"("planId", "serviceId");
CREATE INDEX "idx_customer_plan_service_service" ON "CustomerServicePlanService"("serviceId");

CREATE UNIQUE INDEX "uq_customer_plan_combo" ON "CustomerServicePlanCombo"("planId", "serviceComboId");
CREATE INDEX "idx_customer_plan_combo_combo" ON "CustomerServicePlanCombo"("serviceComboId");

CREATE INDEX "idx_customer_plan_sub_business_status" ON "CustomerPlanSubscription"("businessId", "status");
CREATE INDEX "idx_customer_plan_sub_customer_status" ON "CustomerPlanSubscription"("businessCustomerId", "status");
CREATE INDEX "idx_customer_plan_sub_person_status" ON "CustomerPlanSubscription"("personId", "status");
CREATE INDEX "idx_customer_plan_sub_plan" ON "CustomerPlanSubscription"("planId");
CREATE INDEX "idx_customer_plan_sub_cycle_end" ON "CustomerPlanSubscription"("current_cycle_end");

CREATE UNIQUE INDEX "uq_customer_plan_cycle_subscription_range" ON "CustomerServicePlanCycle"("subscriptionId", "cycle_start", "cycle_end");
CREATE INDEX "idx_customer_plan_cycle_business_range" ON "CustomerServicePlanCycle"("businessId", "cycle_start", "cycle_end");
CREATE INDEX "idx_customer_plan_cycle_sub_end" ON "CustomerServicePlanCycle"("subscriptionId", "cycle_end");

CREATE UNIQUE INDEX "AppointmentPlanRedemption_appointmentId_key" ON "AppointmentPlanRedemption"("appointmentId");
CREATE INDEX "idx_plan_redemption_sub_status" ON "AppointmentPlanRedemption"("subscriptionId", "status");
CREATE INDEX "idx_plan_redemption_cycle_status" ON "AppointmentPlanRedemption"("cycleId", "status");
CREATE INDEX "idx_plan_redemption_status_reserved" ON "AppointmentPlanRedemption"("status", "reserved_at");

CREATE INDEX "idx_recurring_series_business_status" ON "RecurringAppointmentSeries"("businessId", "status");
CREATE INDEX "idx_recurring_series_customer_status" ON "RecurringAppointmentSeries"("businessCustomerId", "status");
CREATE INDEX "idx_recurring_series_prof_status" ON "RecurringAppointmentSeries"("professionalProfileId", "status");
CREATE INDEX "idx_recurring_series_plan_status" ON "RecurringAppointmentSeries"("planSubscriptionId", "status");
CREATE INDEX "idx_recurring_series_status_generated" ON "RecurringAppointmentSeries"("status", "generated_until");

CREATE UNIQUE INDEX "uq_recurring_occurrence_series_start" ON "RecurringAppointmentOccurrence"("seriesId", "scheduled_start_at_utc");
CREATE INDEX "idx_recurring_occurrence_appointment" ON "RecurringAppointmentOccurrence"("appointmentId");
CREATE INDEX "idx_recurring_occurrence_series_status" ON "RecurringAppointmentOccurrence"("seriesId", "status");
CREATE INDEX "idx_recurring_occurrence_status_start" ON "RecurringAppointmentOccurrence"("status", "scheduled_start_at_utc");

CREATE INDEX "idx_ps_customer_plan_subscription" ON "ProfessionalStatement"("customerPlanSubscriptionId");
CREATE INDEX "idx_appointment_person_status_start" ON "Appointment"("personId", "status", "start_at_utc");

ALTER TABLE "CustomerServicePlan" ADD CONSTRAINT "CustomerServicePlan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerServicePlan" ADD CONSTRAINT "CustomerServicePlan_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerServicePlan" ADD CONSTRAINT "CustomerServicePlan_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerServicePlanService" ADD CONSTRAINT "CustomerServicePlanService_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerServicePlanService" ADD CONSTRAINT "CustomerServicePlanService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerServicePlanCombo" ADD CONSTRAINT "CustomerServicePlanCombo_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerServicePlanCombo" ADD CONSTRAINT "CustomerServicePlanCombo_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_businessCustomerId_fkey" FOREIGN KEY ("businessCustomerId") REFERENCES "BusinessCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CustomerServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_sold_by_user_id_fkey" FOREIGN KEY ("sold_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPlanSubscription" ADD CONSTRAINT "CustomerPlanSubscription_revenue_professional_profile_id_fkey" FOREIGN KEY ("revenue_professional_profile_id") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerServicePlanCycle" ADD CONSTRAINT "CustomerServicePlanCycle_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerServicePlanCycle" ADD CONSTRAINT "CustomerServicePlanCycle_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CustomerPlanSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AppointmentPlanRedemption" ADD CONSTRAINT "AppointmentPlanRedemption_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentPlanRedemption" ADD CONSTRAINT "AppointmentPlanRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CustomerPlanSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentPlanRedemption" ADD CONSTRAINT "AppointmentPlanRedemption_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CustomerServicePlanCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_businessCustomerId_fkey" FOREIGN KEY ("businessCustomerId") REFERENCES "BusinessCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_planSubscriptionId_fkey" FOREIGN KEY ("planSubscriptionId") REFERENCES "CustomerPlanSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentSeries" ADD CONSTRAINT "RecurringAppointmentSeries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RecurringAppointmentOccurrence" ADD CONSTRAINT "RecurringAppointmentOccurrence_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringAppointmentSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringAppointmentOccurrence" ADD CONSTRAINT "RecurringAppointmentOccurrence_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessionalStatement" ADD CONSTRAINT "ProfessionalStatement_customerPlanSubscriptionId_fkey" FOREIGN KEY ("customerPlanSubscriptionId") REFERENCES "CustomerPlanSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
