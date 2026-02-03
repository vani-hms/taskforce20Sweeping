-- CreateEnum
CREATE TYPE "TwinbinVisitStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TwinbinVisitReport" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "inspectionAnswers" JSONB NOT NULL,
    "status" "TwinbinVisitStatus" NOT NULL DEFAULT 'PENDING_QC',
    "reviewedByQcId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwinbinVisitReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwinbinVisitReport_cityId_idx" ON "TwinbinVisitReport"("cityId");

-- CreateIndex
CREATE INDEX "TwinbinVisitReport_binId_idx" ON "TwinbinVisitReport"("binId");

-- AddForeignKey
ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "TwinbinLitterBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
