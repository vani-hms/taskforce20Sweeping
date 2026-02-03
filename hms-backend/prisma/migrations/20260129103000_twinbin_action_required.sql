-- CreateEnum
CREATE TYPE "ReportActionStatus" AS ENUM ('APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'ACTION_TAKEN');

-- AlterEnum
ALTER TYPE "TwinbinVisitStatus" ADD VALUE IF NOT EXISTS 'PENDING_QC';

-- AlterTable
ALTER TABLE "TwinbinVisitReport"
ADD COLUMN "actionStatus" "ReportActionStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "qcRemark" TEXT,
ADD COLUMN "actionTakenById" TEXT,
ADD COLUMN "actionRemark" TEXT,
ADD COLUMN "actionPhotoUrl" TEXT,
ADD COLUMN "actionTakenAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_actionTakenById_fkey" FOREIGN KEY ("actionTakenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
