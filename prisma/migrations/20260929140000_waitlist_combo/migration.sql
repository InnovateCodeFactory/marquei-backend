-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "serviceComboId" TEXT;

-- AlterTable
ALTER TABLE "WaitlistOffer" ADD COLUMN     "serviceComboId" TEXT;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistOffer" ADD CONSTRAINT "WaitlistOffer_serviceComboId_fkey" FOREIGN KEY ("serviceComboId") REFERENCES "ServiceCombo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
