-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HMS_SUPER_ADMIN', 'CITY_ADMIN', 'COMMISSIONER', 'ACTION_OFFICER', 'EMPLOYEE', 'QC');

-- CreateEnum
CREATE TYPE "GeoLevel" AS ENUM ('CITY', 'ZONE', 'WARD', 'KOTHI', 'SUB_KOTHI', 'GALI');

-- CreateTable
CREATE TABLE "HMS" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HMS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "hmsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
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
    "cityId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CityModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
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
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModuleRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
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
    "cityId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" "GeoLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskforceCase" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
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
    "cityId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskforceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HMS_name_key" ON "HMS"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_code_key" ON "City"("code");

-- CreateIndex
CREATE INDEX "City_hmsId_idx" ON "City"("hmsId");

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

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_hmsId_fkey" FOREIGN KEY ("hmsId") REFERENCES "HMS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityModule" ADD CONSTRAINT "CityModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCity" ADD CONSTRAINT "UserCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleRole" ADD CONSTRAINT "UserModuleRole_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoNode" ADD CONSTRAINT "GeoNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeoNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceCase" ADD CONSTRAINT "TaskforceCase_geoNodeId_fkey" FOREIGN KEY ("geoNodeId") REFERENCES "GeoNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskforceActivity" ADD CONSTRAINT "TaskforceActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "TaskforceCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
