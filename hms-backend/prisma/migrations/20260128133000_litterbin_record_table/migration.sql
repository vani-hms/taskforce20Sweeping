DO $$
BEGIN
  -- If LitterBinRecord already exists, do nothing
  IF to_regclass('public."LitterBinRecord"') IS NOT NULL THEN
    RETURN;
  END IF;

  -- If legacy TwinbinRecord exists, rename it
  IF to_regclass('public."TwinbinRecord"') IS NOT NULL THEN
    ALTER TABLE "TwinbinRecord" RENAME TO "LitterBinRecord";
  ELSE
    -- Otherwise create the table per current schema
    CREATE TABLE "LitterBinRecord" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "cityId" UUID NOT NULL,
      "createdBy" UUID NOT NULL,
      "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
      "payload" JSONB NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LitterBinRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
      CONSTRAINT "LitterBinRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    );
    CREATE INDEX IF NOT EXISTS "LitterBinRecord_cityId_idx" ON "LitterBinRecord"("cityId");
  END IF;
END$$;
