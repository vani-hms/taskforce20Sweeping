-- CreateEnum
CREATE TYPE "TaskforceReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateTable
CREATE TABLE "TaskforceFeederReport" (
    "id" UUID NOT NULL,
    "feederPointId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TaskforceReportStatus" NOT NULL,
    "reviewedByQcId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskforceFeederReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskforceFeederReport_cityId_idx" ON "TaskforceFeederReport"("cityId");

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_feederPointId_fkey" FOREIGN KEY ("feederPointId") REFERENCES "TaskforceFeederPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

