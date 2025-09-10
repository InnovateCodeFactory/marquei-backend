/*
  Warnings:

  - The `birthdate` column on the `Person` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Person" DROP COLUMN "birthdate",
ADD COLUMN     "birthdate" DATE;
