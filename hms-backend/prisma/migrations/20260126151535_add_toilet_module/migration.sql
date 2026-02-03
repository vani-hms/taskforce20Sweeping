-- CreateTable
CREATE TABLE "Toilet" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "type" "ToiletType" NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toilet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletInspectionQuestion" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToiletInspectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletInspection" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "toiletId" TEXT NOT NULL,
    "inspectedById" TEXT NOT NULL,
    "status" "ToiletInspectionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "comment" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToiletInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletInspectionAnswer" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" BOOLEAN NOT NULL,

    CONSTRAINT "ToiletInspectionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToiletInspectionPhoto" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToiletInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Toilet_cityId_wardId_idx" ON "Toilet"("cityId", "wardId");

-- CreateIndex
CREATE INDEX "ToiletInspectionQuestion_cityId_idx" ON "ToiletInspectionQuestion"("cityId");

-- CreateIndex
CREATE INDEX "ToiletInspection_cityId_status_idx" ON "ToiletInspection"("cityId", "status");

-- CreateIndex
CREATE INDEX "ToiletInspection_cityId_toiletId_idx" ON "ToiletInspection"("cityId", "toiletId");

-- CreateIndex
CREATE INDEX "ToiletInspection_inspectedById_idx" ON "ToiletInspection"("inspectedById");

-- CreateIndex
CREATE INDEX "ToiletInspectionAnswer_inspectionId_idx" ON "ToiletInspectionAnswer"("inspectionId");

-- CreateIndex
CREATE INDEX "ToiletInspectionPhoto_inspectionId_idx" ON "ToiletInspectionPhoto"("inspectionId");

-- AddForeignKey
ALTER TABLE "Toilet" ADD CONSTRAINT "Toilet_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toilet" ADD CONSTRAINT "Toilet_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "GeoNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspectionQuestion" ADD CONSTRAINT "ToiletInspectionQuestion_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspection" ADD CONSTRAINT "ToiletInspection_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspection" ADD CONSTRAINT "ToiletInspection_toiletId_fkey" FOREIGN KEY ("toiletId") REFERENCES "Toilet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspection" ADD CONSTRAINT "ToiletInspection_inspectedById_fkey" FOREIGN KEY ("inspectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspection" ADD CONSTRAINT "ToiletInspection_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspectionAnswer" ADD CONSTRAINT "ToiletInspectionAnswer_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ToiletInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspectionAnswer" ADD CONSTRAINT "ToiletInspectionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ToiletInspectionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToiletInspectionPhoto" ADD CONSTRAINT "ToiletInspectionPhoto_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ToiletInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
