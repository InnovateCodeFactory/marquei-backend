-- DropIndex
DROP INDEX "public"."User_email_key";

-- DropIndex
DROP INDEX "public"."idx_user_email";

-- CreateTable
CREATE TABLE "public"."Guest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "device_token" TEXT NOT NULL,
    "device_info" JSONB NOT NULL,
    "push_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_userId_key" ON "public"."Guest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_device_token_key" ON "public"."Guest"("device_token");

-- CreateIndex
CREATE INDEX "idx_guest_device_token" ON "public"."Guest"("device_token");

-- CreateIndex
CREATE INDEX "idx_user_email_user_type" ON "public"."User"("email", "user_type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_user_type_key" ON "public"."User"("email", "user_type");

-- AddForeignKey
ALTER TABLE "public"."Guest" ADD CONSTRAINT "Guest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
