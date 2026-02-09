-- AlterTable
ALTER TABLE "SweepingInspection" ADD COLUMN     "actionOfficerId" UUID,
ADD COLUMN     "currentOwnerRole" "Role" NOT NULL DEFAULT 'QC';

-- AddForeignKey
ALTER TABLE "SweepingInspection" ADD CONSTRAINT "SweepingInspection_actionOfficerId_fkey" FOREIGN KEY ("actionOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
