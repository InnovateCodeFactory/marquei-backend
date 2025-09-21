-- CreateTable
CREATE TABLE "SystemGeneralSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "terms_of_service_url" TEXT,
    "privacy_policy_url" TEXT,
    "help_center_url" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "twitter_url" TEXT,
    "linkedin_url" TEXT,
    "whatsapp_number" TEXT,
    "app_store_url" TEXT,
    "play_store_url" TEXT,
    "default_business_image" TEXT,
    "default_business_cover_image" TEXT,
    "default_user_image" TEXT,
    "default_professional_image" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemGeneralSettings_pkey" PRIMARY KEY ("id")
);
