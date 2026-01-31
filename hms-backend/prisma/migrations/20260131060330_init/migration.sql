-- CreateEnum
CREATE TYPE "SweepingInspectionStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'ACTION_SUBMITTED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HMS_SUPER_ADMIN', 'CITY_ADMIN', 'COMMISSIONER', 'ACTION_OFFICER', 'EMPLOYEE', 'QC');

-- CreateEnum
CREATE TYPE "GeoLevel" AS ENUM ('CITY', 'ZONE', 'WARD', 'KOTHI', 'SUB_KOTHI', 'GALI', 'AREA', 'BEAT');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'SLUM');

-- CreateEnum
CREATE TYPE "ModuleRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "BinCondition" AS ENUM ('GOOD', 'DAMAGED');

-- CreateEnum
CREATE TYPE "TwinbinVisitStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TwinbinReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "ReportActionStatus" AS ENUM ('APPROVED', 'REJECTED', 'ACTION_REQUIRED', 'ACTION_TAKEN');

-- CreateEnum
CREATE TYPE "TaskforceRequestStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "TaskforceReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "TwinbinBinStatus" AS ENUM ('PENDING_QC', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IECStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "HMS" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HMS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city" (
    "id" UUID NOT NULL,
    "hmsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ulbCode" TEXT,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityModule" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CityModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCity" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "UserCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleRole" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "zoneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wardIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "UserModuleRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT,
    "role" "Role" NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoNode" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "parentId" TEXT,
    "level" "GeoLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areaType" "AreaType",

    CONSTRAINT "GeoNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceCase" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "geoNodeId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedTo" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskforceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceActivity" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskforceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IECForm" (
    "id" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IECStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IECForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LitterBinRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LitterBinRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LitterBin" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "zoneId" UUID,
    "wardId" UUID,
    "areaName" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "locationName" TEXT NOT NULL,
    "roadType" TEXT NOT NULL,
    "isFixedProperly" BOOLEAN NOT NULL,
    "hasLid" BOOLEAN NOT NULL,
    "condition" "BinCondition" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "TwinbinBinStatus" NOT NULL,
    "assignedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedByQcId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LitterBin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LitterBinVisitReport" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "binId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "inspectionAnswers" JSONB NOT NULL,
    "status" "TwinbinVisitStatus" NOT NULL DEFAULT 'PENDING_QC',
    "actionStatus" "ReportActionStatus" NOT NULL DEFAULT 'APPROVED',
    "qcRemark" TEXT,
    "actionTakenById" UUID,
    "actionRemark" TEXT,
    "actionPhotoUrl" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "reviewedByQcId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LitterBinVisitReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LitterBinReport" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "binId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "reviewedByQcId" UUID,
    "status" "TwinbinReportStatus" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "questionnaire" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "LitterBinReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceFeederPoint" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "zoneId" UUID,
    "wardId" UUID,
    "zoneName" TEXT DEFAULT '',
    "wardName" TEXT DEFAULT '',
    "areaName" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "feederPointName" TEXT NOT NULL,
    "locationDescription" TEXT NOT NULL,
    "populationDensity" TEXT NOT NULL DEFAULT '',
    "accessibilityLevel" TEXT NOT NULL DEFAULT '',
    "householdsCount" INTEGER NOT NULL DEFAULT 0,
    "vehicleType" TEXT NOT NULL DEFAULT '',
    "landmark" TEXT NOT NULL DEFAULT '',
    "photoUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "TaskforceRequestStatus" NOT NULL,
    "assignedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedByQcId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskforceFeederPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cityId" UUID NOT NULL,
    "createdBy" UUID NOT NULL,
    "status" "ModuleRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskforceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceFeederReport" (
    "id" UUID NOT NULL,
    "feederPointId" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "TaskforceReportStatus" NOT NULL,
    "reviewedByQcId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskforceFeederReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRegistrationRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "aadhaar" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "cityId" UUID NOT NULL,
    "zoneId" TEXT,
    "wardId" TEXT,
    "requestedModules" TEXT[],
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByUserId" UUID,
    "approvedByRole" "Role",
    "approvedAt" TIMESTAMPTZ(6),
    "rejectedByUserId" UUID,
    "rejectedByRole" "Role",
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectReason" TEXT,

    CONSTRAINT "UserRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingBeat" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "geoNodeBeatId" TEXT NOT NULL,
    "areaType" "AreaType" NOT NULL,
    "assignedEmployeeId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SweepingBeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingInspection" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "sweepingBeatId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "SweepingInspectionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "qcReviewedById" UUID,
    "qcReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SweepingInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingInspectionAnswer" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "questionCode" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepingInspectionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingInspectionPhoto" (
    "id" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "answerId" UUID,
    "actionResponseId" UUID,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepingInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SweepingActionResponse" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "inspectionId" UUID NOT NULL,
    "actionOfficerId" UUID NOT NULL,
    "remarks" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SweepingActionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HMS_name_key" ON "HMS"("name");

-- CreateIndex
CREATE UNIQUE INDEX "city_code_key" ON "city"("code");

-- CreateIndex
CREATE INDEX "city_hmsId_idx" ON "city"("hmsId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_name_key" ON "Module"("name");

-- CreateIndex
CREATE INDEX "CityModule_cityId_moduleId_idx" ON "CityModule"("cityId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "CityModule_cityId_moduleId_key" ON "CityModule"("cityId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserCity_cityId_role_idx" ON "UserCity"("cityId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserCity_userId_cityId_role_key" ON "UserCity"("userId", "cityId", "role");

-- CreateIndex
CREATE INDEX "UserModuleRole_cityId_moduleId_role_idx" ON "UserModuleRole"("cityId", "moduleId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleRole_userId_cityId_moduleId_role_key" ON "UserModuleRole"("userId", "cityId", "moduleId", "role");

-- CreateIndex
CREATE INDEX "Permission_cityId_moduleId_role_idx" ON "Permission"("cityId", "moduleId", "role");

-- CreateIndex
CREATE INDEX "Permission_cityId_resource_action_idx" ON "Permission"("cityId", "resource", "action");

-- CreateIndex
CREATE INDEX "GeoNode_cityId_level_idx" ON "GeoNode"("cityId", "level");

-- CreateIndex
CREATE INDEX "GeoNode_cityId_path_idx" ON "GeoNode"("cityId", "path");

-- CreateIndex
CREATE INDEX "TaskforceCase_cityId_status_idx" ON "TaskforceCase"("cityId", "status");

-- CreateIndex
CREATE INDEX "TaskforceCase_cityId_geoNodeId_idx" ON "TaskforceCase"("cityId", "geoNodeId");

-- CreateIndex
CREATE INDEX "TaskforceActivity_cityId_caseId_idx" ON "TaskforceActivity"("cityId", "caseId");

-- CreateIndex
CREATE INDEX "IECForm_cityId_status_idx" ON "IECForm"("cityId", "status");

-- CreateIndex
CREATE INDEX "IECForm_cityId_moduleId_idx" ON "IECForm"("cityId", "moduleId");

-- CreateIndex
CREATE INDEX "SweepingRecord_cityId_idx" ON "SweepingRecord"("cityId");

-- CreateIndex
CREATE INDEX "LitterBinRecord_cityId_idx" ON "LitterBinRecord"("cityId");

-- CreateIndex
CREATE INDEX "LitterBin_cityId_idx" ON "LitterBin"("cityId");

-- CreateIndex
CREATE INDEX "LitterBinVisitReport_cityId_idx" ON "LitterBinVisitReport"("cityId");

-- CreateIndex
CREATE INDEX "LitterBinVisitReport_binId_idx" ON "LitterBinVisitReport"("binId");

-- CreateIndex
CREATE INDEX "LitterBinReport_cityId_idx" ON "LitterBinReport"("cityId");

-- CreateIndex
CREATE INDEX "LitterBinReport_binId_idx" ON "LitterBinReport"("binId");

-- CreateIndex
CREATE INDEX "TaskforceFeederPoint_cityId_idx" ON "TaskforceFeederPoint"("cityId");

-- CreateIndex
CREATE INDEX "TaskforceRecord_cityId_idx" ON "TaskforceRecord"("cityId");

-- CreateIndex
CREATE INDEX "TaskforceFeederReport_cityId_idx" ON "TaskforceFeederReport"("cityId");

-- CreateIndex
CREATE INDEX "UserRegistrationRequest_cityId_idx" ON "UserRegistrationRequest"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRegistrationRequest_email_cityId_key" ON "UserRegistrationRequest"("email", "cityId");

-- CreateIndex
CREATE INDEX "SweepingBeat_cityId_idx" ON "SweepingBeat"("cityId");

-- CreateIndex
CREATE INDEX "SweepingBeat_assignedEmployeeId_idx" ON "SweepingBeat"("assignedEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "SweepingBeat_cityId_geoNodeBeatId_key" ON "SweepingBeat"("cityId", "geoNodeBeatId");

-- CreateIndex
CREATE INDEX "SweepingInspection_cityId_idx" ON "SweepingInspection"("cityId");

-- CreateIndex
CREATE INDEX "SweepingInspection_sweepingBeatId_idx" ON "SweepingInspection"("sweepingBeatId");

-- CreateIndex
CREATE INDEX "SweepingInspection_employeeId_idx" ON "SweepingInspection"("employeeId");

-- CreateIndex
CREATE INDEX "SweepingInspection_status_idx" ON "SweepingInspection"("status");

-- CreateIndex
CREATE INDEX "SweepingInspectionAnswer_inspectionId_idx" ON "SweepingInspectionAnswer"("inspectionId");

-- CreateIndex
CREATE INDEX "SweepingInspectionPhoto_inspectionId_idx" ON "SweepingInspectionPhoto"("inspectionId");

-- CreateIndex
CREATE INDEX "SweepingInspectionPhoto_answerId_idx" ON "SweepingInspectionPhoto"("answerId");

-- CreateIndex
CREATE UNIQUE INDEX "SweepingActionResponse_inspectionId_key" ON "SweepingActionResponse"("inspectionId");

-- CreateIndex
CREATE INDEX "SweepingActionResponse_cityId_idx" ON "SweepingActionResponse"("cityId");

-- CreateIndex
CREATE INDEX "SweepingActionResponse_actionOfficerId_idx" ON "SweepingActionResponse"("actionOfficerId");

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "city_hmsId_fkey" FOREIGN KEY ("hmsId") REFERENCES "HMS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeoNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_geoNodeId_fkey" FOREIGN KEY ("geoNodeId") REFERENCES "GeoNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "TaskforceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IECForm" ADD CONSTRAINT "IECForm_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingRecord" ADD CONSTRAINT "SweepingRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SweepingRecord" ADD CONSTRAINT "SweepingRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LitterBinRecord" ADD CONSTRAINT "LitterBinRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LitterBinRecord" ADD CONSTRAINT "LitterBinRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "LitterBin" ADD CONSTRAINT "LitterBin_approvedByQcId_fkey" FOREIGN KEY ("approvedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBin" ADD CONSTRAINT "LitterBin_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBin" ADD CONSTRAINT "LitterBin_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinVisitReport" ADD CONSTRAINT "LitterBinVisitReport_actionTakenById_fkey" FOREIGN KEY ("actionTakenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinVisitReport" ADD CONSTRAINT "LitterBinVisitReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "LitterBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinVisitReport" ADD CONSTRAINT "LitterBinVisitReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinVisitReport" ADD CONSTRAINT "LitterBinVisitReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinVisitReport" ADD CONSTRAINT "LitterBinVisitReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinReport" ADD CONSTRAINT "LitterBinReport_binId_fkey" FOREIGN KEY ("binId") REFERENCES "LitterBin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinReport" ADD CONSTRAINT "LitterBinReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinReport" ADD CONSTRAINT "LitterBinReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LitterBinReport" ADD CONSTRAINT "LitterBinReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederPoint" ADD CONSTRAINT "TaskforceFeederPoint_approvedByQcId_fkey" FOREIGN KEY ("approvedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceRecord" ADD CONSTRAINT "TaskforceRecord_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskforceRecord" ADD CONSTRAINT "TaskforceRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_feederPointId_fkey" FOREIGN KEY ("feederPointId") REFERENCES "TaskforceFeederPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceFeederReport" ADD CONSTRAINT "TaskforceFeederReport_reviewedByQcId_fkey" FOREIGN KEY ("reviewedByQcId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRegistrationRequest" ADD CONSTRAINT "UserRegistrationRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SweepingBeat" ADD CONSTRAINT "SweepingBeat_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingBeat" ADD CONSTRAINT "SweepingBeat_geoNodeBeatId_fkey" FOREIGN KEY ("geoNodeBeatId") REFERENCES "GeoNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingBeat" ADD CONSTRAINT "SweepingBeat_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspection" ADD CONSTRAINT "SweepingInspection_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspection" ADD CONSTRAINT "SweepingInspection_sweepingBeatId_fkey" FOREIGN KEY ("sweepingBeatId") REFERENCES "SweepingBeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspection" ADD CONSTRAINT "SweepingInspection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspection" ADD CONSTRAINT "SweepingInspection_qcReviewedById_fkey" FOREIGN KEY ("qcReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspectionAnswer" ADD CONSTRAINT "SweepingInspectionAnswer_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SweepingInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspectionPhoto" ADD CONSTRAINT "SweepingInspectionPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SweepingInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspectionPhoto" ADD CONSTRAINT "SweepingInspectionPhoto_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "SweepingInspectionAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingInspectionPhoto" ADD CONSTRAINT "SweepingInspectionPhoto_actionResponseId_fkey" FOREIGN KEY ("actionResponseId") REFERENCES "SweepingActionResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingActionResponse" ADD CONSTRAINT "SweepingActionResponse_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingActionResponse" ADD CONSTRAINT "SweepingActionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SweepingInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SweepingActionResponse" ADD CONSTRAINT "SweepingActionResponse_actionOfficerId_fkey" FOREIGN KEY ("actionOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
