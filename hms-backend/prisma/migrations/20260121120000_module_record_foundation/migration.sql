-- Align City.id and cityId columns to UUID to satisfy FK requirements
ALTER TABLE "CityModule" DROP CONSTRAINT IF EXISTS "CityModule_cityId_fkey";
ALTER TABLE "UserCity" DROP CONSTRAINT IF EXISTS "UserCity_cityId_fkey";
ALTER TABLE "UserModuleRole" DROP CONSTRAINT IF EXISTS "UserModuleRole_cityId_fkey";
ALTER TABLE "Permission" DROP CONSTRAINT IF EXISTS "Permission_cityId_fkey";
ALTER TABLE "GeoNode" DROP CONSTRAINT IF EXISTS "GeoNode_cityId_fkey";
ALTER TABLE "TaskforceCase" DROP CONSTRAINT IF EXISTS "TaskforceCase_cityId_fkey";
ALTER TABLE "TaskforceActivity" DROP CONSTRAINT IF EXISTS "TaskforceActivity_cityId_fkey";
ALTER TABLE "IECForm" DROP CONSTRAINT IF EXISTS "IECForm_cityId_fkey";
ALTER TABLE "UserCity" DROP CONSTRAINT IF EXISTS "UserCity_userId_fkey";
ALTER TABLE "UserModuleRole" DROP CONSTRAINT IF EXISTS "UserModuleRole_userId_fkey";

ALTER TABLE "City" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "CityModule" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "UserCity" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "UserModuleRole" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "Permission" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "GeoNode" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "TaskforceCase" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "TaskforceActivity" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "IECForm" ALTER COLUMN "cityId" TYPE uuid USING "cityId"::uuid;
ALTER TABLE "User" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
ALTER TABLE "UserCity" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
ALTER TABLE "UserModuleRole" ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;

ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create enum for module record status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modulerecordstatus') THEN
    CREATE TYPE "ModuleRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');
  END IF;
END$$;

-- Sweeping Residential
CREATE TABLE IF NOT EXISTS "SweepingResidentialRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sweeping Commercial
CREATE TABLE IF NOT EXISTS "SweepingCommercialRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Twinbin
CREATE TABLE IF NOT EXISTS "TwinbinRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Taskforce generic record
CREATE TABLE IF NOT EXISTS "TaskforceRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FKs
ALTER TABLE "SweepingResidentialRecord"
  ADD CONSTRAINT "SweepingResidentialRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "SweepingResidentialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT;

ALTER TABLE "SweepingCommercialRecord"
  ADD CONSTRAINT "SweepingCommercialRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "SweepingCommercialRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT;

ALTER TABLE "TwinbinRecord"
  ADD CONSTRAINT "TwinbinRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "TwinbinRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT;

ALTER TABLE "TaskforceRecord"
  ADD CONSTRAINT "TaskforceRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "TaskforceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT;

-- Indexes for city isolation
CREATE INDEX IF NOT EXISTS "SweepingResidentialRecord_cityId_idx" ON "SweepingResidentialRecord"("cityId");
CREATE INDEX IF NOT EXISTS "SweepingCommercialRecord_cityId_idx" ON "SweepingCommercialRecord"("cityId");
CREATE INDEX IF NOT EXISTS "TwinbinRecord_cityId_idx" ON "TwinbinRecord"("cityId");
CREATE INDEX IF NOT EXISTS "TaskforceRecord_cityId_idx" ON "TaskforceRecord"("cityId");
