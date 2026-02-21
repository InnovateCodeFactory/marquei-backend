-- AlterTable
ALTER TABLE "Logs" ADD COLUMN "user_name" TEXT;

-- CreateIndex
CREATE INDEX "idx_logs_user_name" ON "Logs"("user_name");
