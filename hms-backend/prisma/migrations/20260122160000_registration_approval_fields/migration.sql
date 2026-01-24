-- Add approval/rejection audit fields
ALTER TABLE "UserRegistrationRequest"
  ADD COLUMN "approvedByUserId" UUID,
  ADD COLUMN "approvedByRole" "Role",
  ADD COLUMN "approvedAt" TIMESTAMPTZ,
  ADD COLUMN "rejectedByUserId" UUID,
  ADD COLUMN "rejectedByRole" "Role",
  ADD COLUMN "rejectedAt" TIMESTAMPTZ,
  ADD COLUMN "rejectReason" TEXT;

-- Existing enum Role already present; ids assumed UUID
