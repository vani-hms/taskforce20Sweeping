-- CreateEnum
CREATE TYPE "TaskforceRequestStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateTable
CREATE TABLE "TaskforceFeederPoint" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "zoneId" UUID,
    "wardId" UUID,
    "areaName" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "feederPointName" TEXT NOT NULL,
    "locationDescription" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "TaskforceRequestStatus" NOT NULL,
    "assignedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedByQcId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskforceFeederPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskforceFeederPoint_cityId_idx" ON "TaskforceFeederPoint"("cityId");

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_approvedByQcId_fkey" FOREIGN KEY ("approvedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;