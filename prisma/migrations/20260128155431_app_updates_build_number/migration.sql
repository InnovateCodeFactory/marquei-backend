-- AlterTable
ALTER TABLE "AppUpdateInteraction" ADD COLUMN     "app_build_number" INTEGER;

-- AlterTable
ALTER TABLE "AppUpdateModal" ADD COLUMN     "target_build_android" INTEGER,
ADD COLUMN     "target_build_ios" INTEGER;

-- CreateIndex
CREATE INDEX "idx_app_update_interaction_user_action_created" ON "AppUpdateInteraction"("user_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "idx_app_update_hotpath" ON "AppUpdateModal"("is_active", "audience", "mode", "created_at");

-- CreateIndex
CREATE INDEX "idx_app_update_target_build_ios" ON "AppUpdateModal"("target_build_ios");

-- CreateIndex
CREATE INDEX "idx_app_update_target_build_android" ON "AppUpdateModal"("target_build_android");
