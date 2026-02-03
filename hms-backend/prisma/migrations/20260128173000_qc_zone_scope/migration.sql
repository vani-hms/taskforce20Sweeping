-- Add zone/ward scoping to UserModuleRole for QC visibility
ALTER TABLE "UserModuleRole"
  ADD COLUMN IF NOT EXISTS "zoneIds" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "wardIds" TEXT[] NOT NULL DEFAULT '{}';
