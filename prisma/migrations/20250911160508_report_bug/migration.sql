-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- CreateTable
CREATE TABLE "BugReports" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BugReports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_bug_report_user" ON "BugReports"("userId");

-- AddForeignKey
ALTER TABLE "BugReports" ADD CONSTRAINT "BugReports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
