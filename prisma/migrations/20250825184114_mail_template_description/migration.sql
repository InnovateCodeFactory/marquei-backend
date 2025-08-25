/*
  Warnings:

  - You are about to drop the column `location` on the `Business` table. All the data in the column will be lost.
  - Added the required column `description` to the `MailTemplate` table without a default value. This is not possible if the table is not empty.

*/


-- AlterTable
ALTER TABLE "MailTemplate" ADD COLUMN     "description" TEXT NOT NULL;
