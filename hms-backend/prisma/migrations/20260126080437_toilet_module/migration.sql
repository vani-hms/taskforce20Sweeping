/*
  Warnings:

  - The primary key for the `City` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SweepingCommercialRecord` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SweepingResidentialRecord` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TaskforceRecord` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TwinbinRecord` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserRegistrationRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[ulbCode]` on the table `City` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ulbCode` to the `City` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ToiletType" AS ENUM ('PUBLIC', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "ToiletInspectionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "CityModule" DROP CONSTRAINT "CityModule_cityId_fkey";

-- DropForeignKey
ALTER TABLE "GeoNode" DROP CONSTRAINT "GeoNode_cityId_fkey";

-- DropForeignKey
ALTER TABLE "IECForm" DROP CONSTRAINT "IECForm_cityId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_cityId_fkey";

-- DropForeignKey
ALTER TABLE "SweepingCommercialRecord" DROP CONSTRAINT "SweepingCommercialRecord_cityId_fkey";

-- DropForeignKey
ALTER TABLE "SweepingCommercialRecord" DROP CONSTRAINT "SweepingCommercialRecord_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "SweepingResidentialRecord" DROP CONSTRAINT "SweepingResidentialRecord_cityId_fkey";

-- DropForeignKey
ALTER TABLE "SweepingResidentialRecord" DROP CONSTRAINT "SweepingResidentialRecord_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "TaskforceActivity" DROP CONSTRAINT "TaskforceActivity_cityId_fkey";

-- DropForeignKey
ALTER TABLE "TaskforceCase" DROP CONSTRAINT "TaskforceCase_cityId_fkey";

-- DropForeignKey
ALTER TABLE "TaskforceRecord" DROP CONSTRAINT "TaskforceRecord_cityId_fkey";

-- DropForeignKey
ALTER TABLE "TaskforceRecord" DROP CONSTRAINT "TaskforceRecord_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "TwinbinRecord" DROP CONSTRAINT "TwinbinRecord_cityId_fkey";

-- DropForeignKey
ALTER TABLE "TwinbinRecord" DROP CONSTRAINT "TwinbinRecord_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "UserCity" DROP CONSTRAINT "UserCity_cityId_fkey";

-- DropForeignKey
ALTER TABLE "UserCity" DROP CONSTRAINT "UserCity_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserModuleRole" DROP CONSTRAINT "UserModuleRole_cityId_fkey";

-- DropForeignKey
ALTER TABLE "UserModuleRole" DROP CONSTRAINT "UserModuleRole_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserRegistrationRequest" DROP CONSTRAINT "UserRegistrationRequest_cityId_fkey";

-- AlterTable
ALTER TABLE "City" DROP CONSTRAINT "City_pkey",
ADD COLUMN     "ulbCode" TEXT NOT NULL,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "City_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "CityModule" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "GeoNode" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "IECForm" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Permission" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SweepingCommercialRecord" DROP CONSTRAINT "SweepingCommercialRecord_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "SweepingCommercialRecord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "SweepingResidentialRecord" DROP CONSTRAINT "SweepingResidentialRecord_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "SweepingResidentialRecord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TaskforceActivity" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TaskforceCase" ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "TaskforceRecord" DROP CONSTRAINT "TaskforceRecord_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "TaskforceRecord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TwinbinRecord" DROP CONSTRAINT "TwinbinRecord_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "TwinbinRecord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UserCity" ADD COLUMN     "wardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "zoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "UserModuleRole" ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "UserRegistrationRequest" DROP CONSTRAINT "UserRegistrationRequest_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "cityId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "approvedByUserId" SET DATA TYPE TEXT,
ALTER COLUMN "approvedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "rejectedByUserId" SET DATA TYPE TEXT,
ALTER COLUMN "rejectedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "UserRegistrationRequest_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "City_ulbCode_key" ON "City"("ulbCode");

-- AddForeignKey
ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingResidentialRecord" ADD CONSTRAINT "SweepingResidentialRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingResidentialRecord" ADD CONSTRAINT "SweepingResidentialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingCommercialRecord" ADD CONSTRAINT "SweepingCommercialRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingCommercialRecord" ADD CONSTRAINT "SweepingCommercialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwinbinRecord" ADD CONSTRAINT "TwinbinRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwinbinRecord" ADD CONSTRAINT "TwinbinRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceRecord" ADD CONSTRAINT "TaskforceRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceRecord" ADD CONSTRAINT "TaskforceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRegistrationRequest" ADD CONSTRAINT "UserRegistrationRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
