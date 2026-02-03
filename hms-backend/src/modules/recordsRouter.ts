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

      let where: any = {}; // QC: Start with empty, no cityId
      let visitWhere: any = {};
      let reportWhere: any = {};

      if (isCityAdmin) {
        where.cityId = cityId;
        visitWhere.cityId = cityId;
        reportWhere.cityId = cityId;
      } else if (isQc) {
        // QC: strictly scope based
        const moduleId = await getModuleIdByName(moduleKey);

        const { getQcScope } = await import("../utils/qcScope");
        const scope = await getQcScope({ userId: req.auth!.sub!, cityId, moduleId });

        const conditions: any[] = [];
        if (scope.zoneIds.length > 0) {
          conditions.push({
            OR: [{ zoneId: { in: scope.zoneIds } }, { zoneId: null }]
          });
        }
        if (scope.wardIds.length > 0) {
          conditions.push({
            OR: [{ wardId: { in: scope.wardIds } }, { wardId: null }]
          });
        }

        if (conditions.length > 0) {
          const andFilter = { AND: conditions };
          const binAndFilter = { bin: { AND: conditions } };

          where = { ...where, ...andFilter };
          visitWhere = { ...visitWhere, ...binAndFilter };
          reportWhere = { ...reportWhere, ...binAndFilter };
        } else {
          // Fallback to cityId only if no scope
          where.cityId = cityId;
          visitWhere.cityId = cityId;
          reportWhere.cityId = cityId;
        }

        // QC should see ALL reports in scope, including those with Action Officer
        // reportWhere.currentOwnerRole = Role.QC; // REMOVED
      }

      // Pagination & Tab Params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const tab = (req.query.tab as string) || 'HISTORY';

      // Base filters from QC Scope (already calculated above in `where`/`visitWhere`/`reportWhere`)

      let bins: any[] = [];
      let visits: any[] = [];
      let reports: any[] = [];
      let totalRecords = 0;

      // Execute queries based on Tab to ensure efficient pagination
      if (tab === 'DAILY_REPORTS') {
        // Visits only
        [visits, totalRecords] = await Promise.all([
          prisma.litterBinVisitReport.findMany({
            where: visitWhere,
            include: { bin: true },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit
          }),
          prisma.litterBinVisitReport.count({ where: visitWhere })
        ]);
      } else if (tab === 'BIN_REQUESTS') {
        // Bins pending/rejected
        const reqWhere = { ...where, status: { in: ['PENDING_QC', 'REJECTED'] } };
        [bins, totalRecords] = await Promise.all([
          prisma.litterBin.findMany({
            where: reqWhere,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit
          }),
          prisma.litterBin.count({ where: reqWhere })
        ]);
      } else if (tab === 'APPROVED_BINS') {
        // Bins approved
        const approvedWhere = { ...where, status: 'APPROVED' };
        [bins, totalRecords] = await Promise.all([
          prisma.litterBin.findMany({
            where: approvedWhere,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit
          }),
          prisma.litterBin.count({ where: approvedWhere })
        ]);
      } else {
        // HISTORY / ALL
        const [b, v, r, cB, cV, cR] = await Promise.all([
          prisma.litterBin.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
          prisma.litterBinVisitReport.findMany({ where: visitWhere, include: { bin: true }, orderBy: { createdAt: "desc" }, take: limit }),
          prisma.litterBinReport.findMany({ where: reportWhere, include: { bin: true }, orderBy: { createdAt: "desc" }, take: limit }),
          prisma.litterBin.count({ where }),
          prisma.litterBinVisitReport.count({ where: visitWhere }),
          prisma.litterBinReport.count({ where: reportWhere })
        ]);
        bins = b; visits = v; reports = r;
        totalRecords = cB + cV + cR;
      }

      // ... (Rest of resolution logic maps to these results)

      // Collect IDs...
      const zoneIds = new Set<string>();
      const wardIds = new Set<string>();

      bins.forEach(b => { if (b.zoneId) zoneIds.add(b.zoneId); if (b.wardId) wardIds.add(b.wardId); });
      visits.forEach(v => { if (v.bin?.zoneId) zoneIds.add(v.bin.zoneId); if (v.bin?.wardId) wardIds.add(v.bin.wardId); });
      reports.forEach(r => { if (r.bin?.zoneId) zoneIds.add(r.bin.zoneId); if (r.bin?.wardId) wardIds.add(r.bin.wardId); });

      const allGeoIds = Array.from(new Set([...zoneIds, ...wardIds])); // Dedup
      let geoMap = new Map();
      if (allGeoIds.length > 0) {
        const geoNodes = await prisma.geoNode.findMany({ where: { id: { in: allGeoIds } } });
        geoMap = new Map(geoNodes.map(n => [n.id, n.name]));
      }

      const mappedBins = bins.map((b) => ({
        id: b.id,
        type: "BIN_REGISTRATION",
        status: b.status,
        areaName: b.areaName,
        locationName: b.locationName,
        zoneId: b.zoneId,
        wardId: b.wardId,
        zoneName: b.zoneId ? geoMap.get(b.zoneId) : undefined,
        wardName: b.wardId ? geoMap.get(b.wardId) : undefined,
        createdAt: b.createdAt
      }));

      const mappedVisits = visits.map((v) => ({
        id: v.id,
        type: "VISIT_REPORT",
        status: v.status,
        actionStatus: v.actionStatus,
        currentOwnerRole: v.currentOwnerRole,
        areaName: v.bin?.areaName,
        locationName: v.bin?.locationName,
        zoneId: v.bin?.zoneId,
        wardId: v.bin?.wardId,
        zoneName: v.bin?.zoneId ? geoMap.get(v.bin.zoneId) : undefined,
        wardName: v.bin?.wardId ? geoMap.get(v.bin.wardId) : undefined,
        createdAt: v.createdAt
      }));

      const mappedReports = reports.map((r) => ({
        id: r.id,
        type: "CITIZEN_REPORT",
        status: r.status === "SUBMITTED" ? "PENDING_QC" : r.status,
        actionStatus: r.actionOfficerRespondedAt ? 'ACTION_TAKEN' : (r.status === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : undefined),
        currentOwnerRole: r.currentOwnerRole,
        areaName: r.bin?.areaName,
        locationName: r.bin?.locationName,
        zoneId: r.bin?.zoneId,
        wardId: r.bin?.wardId,
        zoneName: r.bin?.zoneId ? geoMap.get(r.bin.zoneId) : undefined,
        wardName: r.bin?.wardId ? geoMap.get(r.bin.wardId) : undefined,
        createdAt: r.createdAt
      }));

      let allRecords = [...mappedBins, ...mappedVisits, ...mappedReports];
      // Sort logic again because we might have mixed results in strict tab or History
      allRecords.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // If History tab, slice again to ensure limit consistency after merge
      if (tab === 'HISTORY' || tab === 'ALL') {
        allRecords = allRecords.slice(0, limit);
      }

      // Calculate aggregated stats for the dashboard (independent of pagination)
      // This ensures KPI cards still work
      const [statsPendingBins, statsApprovedBins, statsRejectedBins, statsPendingVisits, statsTotalBins, statsTotalVisits] = await Promise.all([
        prisma.litterBin.count({ where: { ...where, status: { in: ['PENDING_QC'] } } }),
        prisma.litterBin.count({ where: { ...where, status: 'APPROVED' } }),
        prisma.litterBin.count({ where: { ...where, status: 'REJECTED' } }),
        prisma.litterBinVisitReport.count({ where: { ...visitWhere, status: 'PENDING_QC' } }),
        prisma.litterBin.count({ where: where }), // Total Bins in scope
        prisma.litterBinVisitReport.count({ where: visitWhere }) // Total Visits in scope
      ]);

      const stats = {
        pending: statsPendingBins + statsPendingVisits,
        approved: statsApprovedBins, // Visits don't have 'APPROVED' state persistence in same way usually, or we just count bins
        rejected: statsRejectedBins,
        actionRequired: 0, // QC should not see ACTION_REQUIRED items (owned by Action Officers)
        total: statsTotalBins + statsTotalVisits // Approximate total work items
      };

      res.json({
        city: city?.name || cityId,
        module: getModuleLabel(moduleKey),
        data: allRecords,
        stats,
        meta: {
          page,
          limit,
          total: totalRecords,
          totalPages: Math.ceil(totalRecords / limit)
        }
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

    const records = await model.findMany({ where: { cityId }, orderBy: { createdAt: "desc" }, take: 50 }); // Generic default limit
    res.json({
      city: city?.name || cityId,
      module: getModuleLabel(moduleKey),
      data: records,
      meta: {
        page: 1,
        limit: 50,
        total: records.length,
        totalPages: 1
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
