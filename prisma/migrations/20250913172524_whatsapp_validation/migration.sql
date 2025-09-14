-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- CreateTable
CREATE TABLE "WhatsAppValidation" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "whatsapp_message_id" TEXT,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_whatsapp_validation_phone" ON "WhatsAppValidation"("phone_number");

-- CreateIndex
CREATE INDEX "idx_whatsapp_validation_code" ON "WhatsAppValidation"("code");
