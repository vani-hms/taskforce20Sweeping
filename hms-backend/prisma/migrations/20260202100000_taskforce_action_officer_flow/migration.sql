-- Taskforce report action officer flow
DO $$
BEGIN
  BEGIN
    CREATE TYPE "TaskforceReportStatus" AS ENUM ('SUBMITTED', 'PENDING_QC', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');
  EXCEPTION WHEN duplicate_object THEN
    -- Type already exists, fall through to ALTER below
    NULL;
  END;

  BEGIN
    ALTER TYPE "TaskforceReportStatus" ADD VALUE IF NOT EXISTS 'PENDING_QC';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;

ALTER TABLE "TaskforceFeederReport"
  ADD COLUMN IF NOT EXISTS "currentOwnerRole" "Role" NOT NULL DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS "actionOfficerId" UUID,
  ADD COLUMN IF NOT EXISTS "actionOfficerRemark" TEXT,
  ADD COLUMN IF NOT EXISTS "actionOfficerRespondedAt" TIMESTAMPTZ;

ALTER TABLE "TaskforceFeederReport"
  ADD CONSTRAINT "TaskforceFeederReport_actionOfficerId_fkey"
  FOREIGN KEY ("actionOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "TaskforceFeederReport_actionOfficerId_idx" ON "TaskforceFeederReport"("actionOfficerId");
CREATE INDEX IF NOT EXISTS "TaskforceFeederReport_currentOwnerRole_idx" ON "TaskforceFeederReport"("currentOwnerRole");
