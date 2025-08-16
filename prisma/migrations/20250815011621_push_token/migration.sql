/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "push_token" TEXT;
