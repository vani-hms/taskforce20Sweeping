-- LitterBins Action Officer ownership fields and status update
DO $$
BEGIN
  BEGIN
    ALTER TYPE "TwinbinReportStatus" ADD VALUE IF NOT EXISTS 'PENDING_QC';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;

ALTER TABLE "LitterBinReport"
  ADD COLUMN IF NOT EXISTS "currentOwnerRole" "Role" NOT NULL DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS "actionOfficerId" UUID,
  ADD COLUMN IF NOT EXISTS "actionOfficerRemark" TEXT,
  ADD COLUMN IF NOT EXISTS "actionOfficerRespondedAt" TIMESTAMPTZ;

ALTER TABLE "LitterBinReport"
  ADD CONSTRAINT "LitterBinReport_actionOfficerId_fkey"
  FOREIGN KEY ("actionOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "LitterBinReport_currentOwnerRole_idx" ON "LitterBinReport"("currentOwnerRole");
CREATE INDEX IF NOT EXISTS "LitterBinReport_actionOfficerId_idx" ON "LitterBinReport"("actionOfficerId");
