-- RegistrationStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registrationstatus') THEN
    CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
  END IF;
END$$;

CREATE TABLE "UserRegistrationRequest" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "aadhaar" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "cityId" UUID NOT NULL,
  "zoneId" TEXT,
  "wardId" TEXT,
  "requestedModules" TEXT[] NOT NULL,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "UserRegistrationRequest"
  ADD CONSTRAINT "UserRegistrationRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE;

CREATE INDEX "UserRegistrationRequest_cityId_idx" ON "UserRegistrationRequest"("cityId");
CREATE UNIQUE INDEX "UserRegistrationRequest_email_cityId_key" ON "UserRegistrationRequest"("email","cityId");
