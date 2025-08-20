-- DropIndex
DROP INDEX "public"."User_personId_key";

-- AlterTable
ALTER TABLE "public"."InAppNotification" ADD COLUMN     "personId" TEXT;

-- CreateIndex
CREATE INDEX "idx_notification_person" ON "public"."InAppNotification"("personId");

-- AddForeignKey
ALTER TABLE "public"."InAppNotification" ADD CONSTRAINT "InAppNotification_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
