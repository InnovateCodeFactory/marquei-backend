-- CreateTable
CREATE TABLE "InnovateConnectAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InnovateConnectAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InnovateConnectAdmin_email_key" ON "InnovateConnectAdmin"("email");

-- CreateIndex
CREATE INDEX "idx_innovate_connect_admin_email" ON "InnovateConnectAdmin"("email");

-- CreateIndex
CREATE INDEX "idx_innovate_connect_admin_active" ON "InnovateConnectAdmin"("is_active");
