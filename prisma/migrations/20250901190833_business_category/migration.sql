-- CreateEnum
CREATE TYPE "BusinessPublicType" AS ENUM ('MALE', 'FEMALE', 'BOTH');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "business_category_custom" TEXT,
ADD COLUMN     "public_type" "BusinessPublicType" NOT NULL DEFAULT 'BOTH';

-- AlterTable
ALTER TABLE "BusinessCategory" ADD COLUMN     "icon_path" TEXT;
