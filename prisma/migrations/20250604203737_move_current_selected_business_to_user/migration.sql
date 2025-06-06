-- AlterTable
ALTER TABLE "ProfessionalProfile" DROP COLUMN "current_selected_business";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "current_selected_business_slug" TEXT;
