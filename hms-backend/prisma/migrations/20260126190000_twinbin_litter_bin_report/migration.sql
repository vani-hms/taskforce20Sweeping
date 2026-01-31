-- CreateEnum
CREATE TYPE "TwinbinReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateTable
CREATE TABLE "TwinbinLitterBinReport" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "binId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reviewedByQcId" UUID,
    "status" "TwinbinReportStatus" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "questionnaire" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "TwinbinLitterBinReport_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "TwinbinLitterBinReport_cityId_idx" ON "TwinbinLitterBinReport"("cityId");
CREATE INDEX "TwinbinLitterBinReport_binId_idx" ON "TwinbinLitterBinReport"("binId");

-- Foreign Keys
ALTER TABLE "TwinbinLitterBinReport" ADD CONSTRAINT "TwinbinLitterBinReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinbinLitterBinReport" ADD CONSTRAINT "TwinbinLitterBinReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "TwinbinLitterBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinbinLitterBinReport" ADD CONSTRAINT "TwinbinLitterBinReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TwinbinLitterBinReport" ADD CONSTRAINT "TwinbinLitterBinReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
