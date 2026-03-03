/*
  Warnings:

  - You are about to drop the column `salaryRange` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmployerProfile" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "salaryRange",
ADD COLUMN     "benefits" TEXT[],
ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "educationLevel" TEXT,
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRemote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minExperience" INTEGER,
ADD COLUMN     "numberOfEmployees" INTEGER,
ADD COLUMN     "responsibilities" TEXT[],
ADD COLUMN     "salaryAmount" TEXT,
ADD COLUMN     "salaryFrequency" TEXT,
ADD COLUMN     "salaryType" TEXT;
