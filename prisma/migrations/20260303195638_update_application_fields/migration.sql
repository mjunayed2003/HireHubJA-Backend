-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "resumeUrl" TEXT,
ADD COLUMN     "shortMessage" TEXT;
