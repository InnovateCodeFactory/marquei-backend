-- CreateTable
CREATE TABLE "GuestVisit" (
    "id" TEXT NOT NULL,
    "device_token" TEXT NOT NULL,
    "visited_at" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_guestvisit_device_token" ON "GuestVisit"("device_token");

-- AddForeignKey
ALTER TABLE "GuestVisit" ADD CONSTRAINT "GuestVisit_device_token_fkey" FOREIGN KEY ("device_token") REFERENCES "Guest"("device_token") ON DELETE RESTRICT ON UPDATE CASCADE;
