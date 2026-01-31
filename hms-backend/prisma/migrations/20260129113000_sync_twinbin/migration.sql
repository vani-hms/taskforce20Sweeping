-- Ensure enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bincondition') THEN
    CREATE TYPE "BinCondition" AS ENUM ('GOOD', 'DAMAGED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twinbinbinstatus') THEN
    CREATE TYPE "TwinbinBinStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twinbinvisitstatus') THEN
    CREATE TYPE "TwinbinVisitStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reportactionstatus') THEN
    CREATE TYPE "ReportActionStatus" AS ENUM ('APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'ACTION_TAKEN');
  END IF;
END$$;

-- TwinbinLitterBin table
CREATE TABLE IF NOT EXISTS "TwinbinLitterBin" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "zoneId" TEXT,
    "wardId" TEXT,
    "areaName" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "locationName" TEXT NOT NULL,
    "roadType" TEXT NOT NULL,
    "isFixedProperly" BOOLEAN NOT NULL,
    "hasLid" BOOLEAN NOT NULL,
    "condition" "BinCondition" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "TwinbinBinStatus" NOT NULL,
    "assignedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedByQcId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TwinbinLitterBin_pkey" PRIMARY KEY ("id")
);
-- ensure UUID types to match references
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "cityId" TYPE UUID USING "cityId"::uuid;
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "requestedById" TYPE UUID USING "requestedById"::uuid;
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "zoneId" TYPE UUID USING "zoneId"::uuid;
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "wardId" TYPE UUID USING "wardId"::uuid;
ALTER TABLE "TwinbinLitterBin" ALTER COLUMN "approvedByQcId" TYPE UUID USING "approvedByQcId"::uuid;

-- TwinbinVisitReport table
CREATE TABLE IF NOT EXISTS "TwinbinVisitReport" (
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
    "actionStatus" "ReportActionStatus" NOT NULL DEFAULT 'APPROVED',
    "qcRemark" TEXT,
    "actionTakenById" TEXT,
    "actionRemark" TEXT,
    "actionPhotoUrl" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "reviewedByQcId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TwinbinVisitReport_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "id" TYPE UUID USING "id"::uuid;
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "cityId" TYPE UUID USING "cityId"::uuid;
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "binId" TYPE UUID USING "binId"::uuid;
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "submittedById" TYPE UUID USING "submittedById"::uuid;
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "actionTakenById" TYPE UUID USING "actionTakenById"::uuid;
ALTER TABLE "TwinbinVisitReport" ALTER COLUMN "reviewedByQcId" TYPE UUID USING "reviewedByQcId"::uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS "TwinbinLitterBin_cityId_idx" ON "TwinbinLitterBin"("cityId");
CREATE INDEX IF NOT EXISTS "TwinbinVisitReport_cityId_idx" ON "TwinbinVisitReport"("cityId");
CREATE INDEX IF NOT EXISTS "TwinbinVisitReport_binId_idx" ON "TwinbinVisitReport"("binId");

-- FKs TwinbinLitterBin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinLitterBin_cityId_fkey') THEN
    ALTER TABLE "TwinbinLitterBin" ADD CONSTRAINT "TwinbinLitterBin_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinLitterBin_requestedById_fkey') THEN
    ALTER TABLE "TwinbinLitterBin" ADD CONSTRAINT "TwinbinLitterBin_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinLitterBin_approvedByQcId_fkey') THEN
    ALTER TABLE "TwinbinLitterBin" ADD CONSTRAINT "TwinbinLitterBin_approvedByQcId_fkey" FOREIGN KEY ("approvedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- FKs TwinbinVisitReport
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinVisitReport_cityId_fkey') THEN
    ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinVisitReport_binId_fkey') THEN
    ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "TwinbinLitterBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinVisitReport_submittedById_fkey') THEN
    ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinVisitReport_reviewedByQcId_fkey') THEN
    ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TwinbinVisitReport_actionTakenById_fkey') THEN
    ALTER TABLE "TwinbinVisitReport" ADD CONSTRAINT "TwinbinVisitReport_actionTakenById_fkey" FOREIGN KEY ("actionTakenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
