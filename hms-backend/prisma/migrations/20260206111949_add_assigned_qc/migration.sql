-- AlterTable
ALTER TABLE "SweepingBeat" ADD COLUMN     "assignedQcId" UUID;

-- AddForeignKey
ALTER TABLE "SweepingBeat" ADD CONSTRAINT "SweepingBeat_assignedQcId_fkey" FOREIGN KEY ("assignedQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
