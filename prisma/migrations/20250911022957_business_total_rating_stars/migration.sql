-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "events" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "total_five_star" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_four_star" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_one_star" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_three_star" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_two_star" INTEGER NOT NULL DEFAULT 0;
