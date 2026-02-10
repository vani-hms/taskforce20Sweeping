/*
  Warnings:

  - The primary key for the `InspectionAudit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `InspectionAudit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `inspectionId` on the `InspectionAudit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `actorId` on the `InspectionAudit` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "InspectionAudit" DROP CONSTRAINT "InspectionAudit_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "inspectionId",
ADD COLUMN     "inspectionId" UUID NOT NULL,
DROP COLUMN "actorId",
ADD COLUMN     "actorId" UUID NOT NULL,
ADD CONSTRAINT "InspectionAudit_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "SweepingBeat" ADD COLUMN     "geometry" JSONB;

-- CreateTable
CREATE TABLE "SweepingInspectionQuestion" (
    "id" UUID NOT NULL,
    "questionCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'YES_NO',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepingInspectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SweepingInspectionQuestion_questionCode_key" ON "SweepingInspectionQuestion"("questionCode");

-- CreateIndex
CREATE INDEX "InspectionAudit_inspectionId_idx" ON "InspectionAudit"("inspectionId");

-- AddForeignKey
ALTER TABLE "InspectionAudit" ADD CONSTRAINT "InspectionAudit_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SweepingInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
