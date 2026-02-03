import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../middleware/rbac";
import { prisma } from "../prisma";
import { HttpError } from "../utils/errors";
import { Role } from "../../generated/prisma";
import { getModuleLabel, isCanonicalModuleKey, normalizeModuleKey } from "./moduleMetadata";
import { getModuleIdByName } from "./moduleRegistry";

const router = Router();
router.use(authenticate, requireCityContext());

const MODULE_MODEL_MAP: Record<string, keyof typeof prisma> = {
  SWEEPING: "sweepingRecord",
  LITTERBINS: "litterBinRecord",
  TASKFORCE: "taskforceRecord"
};

router.get("/:moduleKey/records", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleKey = normalizeModuleKey(req.params.moduleKey || "");
    if (!isCanonicalModuleKey(moduleKey)) throw new HttpError(400, "Invalid module key");
    const city = await prisma.city.findUnique({ where: { id: cityId } });

    if (moduleKey === "LITTERBINS") {
      const isCityAdmin = req.auth?.roles?.includes(Role.CITY_ADMIN);
      const isQc = req.auth?.roles?.includes(Role.QC);
      const isAo = req.auth?.roles?.includes(Role.ACTION_OFFICER);

      let where: any = { cityId };
      let visitWhere: any = { cityId };
      let reportWhere: any = { cityId };

      if ((isQc || isAo) && !isCityAdmin) {
        const moduleId = await getModuleIdByName(moduleKey);
        const moduleRoles = await prisma.userModuleRole.findMany({
          where: {
            userId: req.auth!.sub!,
            cityId,
            moduleId,
            role: { in: [Role.QC, Role.ACTION_OFFICER] }
          },
          select: { zoneIds: true, wardIds: true }
        });
        const scope = {
          zoneIds: Array.from(new Set(moduleRoles.flatMap((r) => r.zoneIds || []))),
          wardIds: Array.from(new Set(moduleRoles.flatMap((r) => r.wardIds || [])))
        };

        const geoFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
        const binGeoFilter = {
          bin: {
            OR: [
              { zoneId: { in: scope.zoneIds } },
              { wardId: { in: scope.wardIds } }
            ]
          }
        };

        where = { ...where, ...geoFilter };
        visitWhere = { ...visitWhere, ...binGeoFilter };
        reportWhere = { ...reportWhere, ...binGeoFilter };
      }

      const [bins, visits, reports] = await Promise.all([
        prisma.litterBin.findMany({
          where,
          orderBy: { createdAt: "desc" }
        }),
        prisma.litterBinVisitReport.findMany({
          where: visitWhere,
          include: { bin: true },
          orderBy: { createdAt: "desc" }
        }),
        prisma.litterBinReport.findMany({
          where: reportWhere,
          include: { bin: true },
          orderBy: { createdAt: "desc" }
        })
      ]);

      // Collect all Geo IDs to resolve names
      const zoneIds = new Set<string>();
      const wardIds = new Set<string>();

      bins.forEach((b) => {
        if (b.zoneId) zoneIds.add(b.zoneId);
        if (b.wardId) wardIds.add(b.wardId);
      });
      visits.forEach((v) => {
        if (v.bin?.zoneId) zoneIds.add(v.bin.zoneId);
        if (v.bin?.wardId) wardIds.add(v.bin.wardId);
      });
      reports.forEach((r) => {
        if (r.bin?.zoneId) zoneIds.add(r.bin.zoneId);
        if (r.bin?.wardId) wardIds.add(r.bin.wardId);
      });

      const allGeoIds = [...zoneIds, ...wardIds];
      const geoNodes = await prisma.geoNode.findMany({
        where: { id: { in: allGeoIds } }
      });
      const geoMap = new Map(geoNodes.map((n) => [n.id, n.name]));

      const mappedBins = bins.map((b) => ({
        id: b.id,
        type: "BIN_REGISTRATION",
        status: b.status,
        areaName: b.areaName,
        locationName: b.locationName,
        zoneName: b.zoneId ? geoMap.get(b.zoneId) : undefined,
        wardName: b.wardId ? geoMap.get(b.wardId) : undefined,
        createdAt: b.createdAt
      }));

      const mappedVisits = visits.map((v) => ({
        id: v.id,
        type: "VISIT_REPORT",
        status: v.status,
        areaName: v.bin?.areaName,
        locationName: v.bin?.locationName,
        zoneName: v.bin?.zoneId ? geoMap.get(v.bin.zoneId) : undefined,
        wardName: v.bin?.wardId ? geoMap.get(v.bin.wardId) : undefined,
        createdAt: v.createdAt
      }));

      const mappedReports = reports.map((r) => ({
        id: r.id,
        type: "CITIZEN_REPORT",
        status: r.status === "SUBMITTED" ? "PENDING_QC" : r.status,
        areaName: r.bin?.areaName,
        locationName: r.bin?.locationName,
        zoneName: r.bin?.zoneId ? geoMap.get(r.bin.zoneId) : undefined,
        wardName: r.bin?.wardId ? geoMap.get(r.bin.wardId) : undefined,
        createdAt: r.createdAt
      }));

      const allRecords = [...mappedBins, ...mappedVisits, ...mappedReports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({
        city: city?.name || cityId,
        module: getModuleLabel(moduleKey),
        count: allRecords.length,
        records: allRecords
      });
      return;
    }

    const modelName = MODULE_MODEL_MAP[moduleKey];
    if (!modelName) throw new HttpError(400, "Invalid module key");

    const moduleId = await getModuleIdByName(moduleKey);
    await assertModuleAccess(req, res, moduleId, [
      Role.CITY_ADMIN,
      Role.COMMISSIONER,
      Role.ACTION_OFFICER,
      Role.EMPLOYEE,
      Role.QC
    ]);

    const enabled = await prisma.cityModule.findUnique({ where: { cityId_moduleId: { cityId, moduleId } } });
    if (!enabled || !enabled.enabled) throw new HttpError(403, "Module not enabled for this city");

    const model = (prisma as any)[modelName];
    if (!model) throw new HttpError(500, "Module records not configured");

    const records = await model.findMany({ where: { cityId }, orderBy: { createdAt: "desc" } });
    res.json({
      city: city?.name || cityId,
      module: getModuleLabel(moduleKey),
      count: records.length,
      records
    });
  } catch (err) {
    next(err);
  }
});

export default router;
