-- CreateTable
CREATE TABLE "Logs" (
    "id" TEXT NOT NULL,
    "body" JSONB,
    "query" JSONB,
    "method" VARCHAR(10) NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB,
    "success" BOOLEAN NOT NULL,
    "user_id" TEXT,
    "device_token" TEXT,
    "datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_logs_datetime" ON "Logs"("datetime");

-- CreateIndex
CREATE INDEX "idx_logs_taxnumber" ON "Logs"("user_id");
