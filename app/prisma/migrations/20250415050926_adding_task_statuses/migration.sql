-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PROCESSING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TaskPublishingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FOLDED');

-- CreateEnum
CREATE TYPE "TaskResponsibilityStatus" AS ENUM ('OPEN', 'PARTLY_ASSIGNED', 'FULLY_ASSIGNED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "publishingStatus" "TaskPublishingStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "responsibilityStatus" "TaskResponsibilityStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PROCESSING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstname" TEXT,
ADD COLUMN     "lastname" TEXT;
