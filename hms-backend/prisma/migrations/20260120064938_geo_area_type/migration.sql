-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'SLUM');

-- AlterTable
ALTER TABLE "GeoNode" ADD COLUMN     "areaType" "AreaType";
