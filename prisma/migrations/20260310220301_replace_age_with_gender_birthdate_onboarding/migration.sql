/*
  Warnings:

  - You are about to drop the column `age` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "age",
ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;
