-- CreateEnum
CREATE TYPE "AppUpdateMode" AS ENUM ('new_app_version', 'whats_new');

-- CreateEnum
CREATE TYPE "AppUpdateAudience" AS ENUM ('CUSTOMER', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "AppUpdateAction" AS ENUM ('viewed', 'dismissed', 'primary_clicked');

-- CreateEnum
CREATE TYPE "AppUpdateScope" AS ENUM ('appointments', 'clients', 'new_appointment', 'profile', 'statement');

-- CreateTable
CREATE TABLE "AppUpdateModal" (
    "id" TEXT NOT NULL,
    "mode" "AppUpdateMode" NOT NULL,
    "audience" "AppUpdateAudience" NOT NULL DEFAULT 'PROFESSIONAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "banner_url" TEXT,
    "whats_new_items" TEXT[],
    "primary_button_label" TEXT,
    "secondary_button_label" TEXT,
    "target_version_ios" TEXT,
    "target_version_android" TEXT,
    "cta_path" TEXT,
    "cta_scope" "AppUpdateScope",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUpdateModal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppUpdateInteraction" (
    "id" TEXT NOT NULL,
    "app_update_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AppUpdateAction" NOT NULL,
    "app_version" TEXT,
    "app_os" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppUpdateInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_app_update_mode" ON "AppUpdateModal"("mode");

-- CreateIndex
CREATE INDEX "idx_app_update_audience" ON "AppUpdateModal"("audience");

-- CreateIndex
CREATE INDEX "idx_app_update_active" ON "AppUpdateModal"("is_active");

-- CreateIndex
CREATE INDEX "idx_app_update_interaction_update" ON "AppUpdateInteraction"("app_update_id");

-- CreateIndex
CREATE INDEX "idx_app_update_interaction_user" ON "AppUpdateInteraction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "AppUpdateInteraction_app_update_id_user_id_action_key" ON "AppUpdateInteraction"("app_update_id", "user_id", "action");

-- AddForeignKey
ALTER TABLE "AppUpdateInteraction" ADD CONSTRAINT "AppUpdateInteraction_app_update_id_fkey" FOREIGN KEY ("app_update_id") REFERENCES "AppUpdateModal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppUpdateInteraction" ADD CONSTRAINT "AppUpdateInteraction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
