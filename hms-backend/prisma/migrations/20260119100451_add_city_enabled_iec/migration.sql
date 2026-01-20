-- CreateEnum
CREATE TYPE "IECStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "IECForm" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IECStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IECForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IECForm_cityId_status_idx" ON "IECForm"("cityId", "status");

-- CreateIndex
CREATE INDEX "IECForm_cityId_moduleId_idx" ON "IECForm"("cityId", "moduleId");

-- AddForeignKey
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
