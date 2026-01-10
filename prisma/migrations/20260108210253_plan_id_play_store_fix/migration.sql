-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "plan_id_play_store" TEXT;

-- CreateIndex
CREATE INDEX "idx_plan_id_play_store" ON "Plan"("plan_id_play_store");
