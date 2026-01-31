-- Rename Twinbin tables to LitterBin equivalents
ALTER TABLE "TwinbinLitterBin" RENAME TO "LitterBin";
ALTER TABLE "TwinbinVisitReport" RENAME TO "LitterBinVisitReport";
ALTER TABLE "TwinbinLitterBinReport" RENAME TO "LitterBinReport";
ALTER TABLE "TwinbinRecord" RENAME TO "LitterBinRecord";

-- Merge Sweeping Residential and Commercial into SweepingRecord with areaType
CREATE TABLE IF NOT EXISTS "SweepingRecord" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SweepingRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "SweepingRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX IF NOT EXISTS "SweepingRecord_cityId_idx" ON "SweepingRecord"("cityId");

-- migrate residential data
INSERT INTO "SweepingRecord" (id, "cityId", "createdBy", status, payload, "areaType", "createdAt", "updatedAt")
SELECT id, "cityId", "createdBy", status, payload, 'RESIDENTIAL'::"AreaType", "createdAt", "updatedAt"
FROM "SweepingResidentialRecord";

-- migrate commercial data
INSERT INTO "SweepingRecord" (id, "cityId", "createdBy", status, payload, "areaType", "createdAt", "updatedAt")
SELECT id, "cityId", "createdBy", status, payload, 'COMMERCIAL'::"AreaType", "createdAt", "updatedAt"
FROM "SweepingCommercialRecord";

-- Drop old sweeping tables
DROP TABLE IF EXISTS "SweepingResidentialRecord" CASCADE;
DROP TABLE IF EXISTS "SweepingCommercialRecord" CASCADE;

