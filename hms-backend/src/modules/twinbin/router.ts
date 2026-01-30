import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext } from "../../middleware/rbac";
import { Role, TwinbinBinStatus } from "../../../generated/prisma";
import { HttpError } from "../../utils/errors";
import { validateBody } from "../../utils/validation";
import { assertModuleAccess } from "../../middleware/rbac";
import { getModuleIdByName } from "../moduleRegistry";
import { normalizeModuleKey } from "../moduleMetadata";
import crypto from "crypto";
import { getQcScope } from "../../utils/qcScope";

const router = Router();
const MODULE_KEY = "LITTERBINS";
const PROXIMITY_SECRET = process.env.PROXIMITY_TOKEN_SECRET || "twinbin-proximity-secret";
const PROXIMITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildScopeFilters(scope: { zoneIds: string[]; wardIds: string[] }) {
  const zoneFilter =
    scope.zoneIds.length === 0
      ? undefined
      : {
        OR: [{ zoneId: { in: scope.zoneIds } }, { zoneId: null }]
      };
  const wardFilter =
    scope.wardIds.length === 0
      ? undefined
      : {
        OR: [{ wardId: { in: scope.wardIds } }, { wardId: null }]
      };
  return { zoneFilter, wardFilter };
}

router.use(authenticate, requireCityContext());

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function forbidCityAdminOrCommissioner(req: any) {
  if (req.auth?.roles?.includes(Role.CITY_ADMIN) || req.auth?.roles?.includes(Role.COMMISSIONER)) {
    throw new HttpError(403, "Forbidden");
  }
}

async function ensureGeoValid(cityId: string, zoneId?: string | null, wardId?: string | null) {
  if (zoneId) {
    const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
    if (!zone || zone.cityId !== cityId || zone.level !== "ZONE") throw new HttpError(400, "Invalid zone for city");
  }
  if (wardId) {
    const ward = await prisma.geoNode.findUnique({ where: { id: wardId } });
    if (!ward || ward.cityId !== cityId || ward.level !== "WARD") throw new HttpError(400, "Invalid ward for city");
    if (zoneId && ward.parentId !== zoneId) throw new HttpError(400, "Ward not under selected zone");
  }
}

const requestSchema = z.object({
  zoneId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  areaName: z.string().min(1),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]),
  locationName: z.string().min(1),
  roadType: z.string().min(1),
  isFixedProperly: z.boolean(),
  hasLid: z.boolean(),
  condition: z.enum(["GOOD", "DAMAGED"]),
  latitude: z.number(),
  longitude: z.number()
});

router.post("/bins/request", validateBody(requestSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const payload = req.body as z.infer<typeof requestSchema>;

    // Resolve zone/ward from payload or employee city scope
    const employeeCity = await prisma.userCity.findFirst({
      where: { userId, cityId, role: Role.EMPLOYEE },
      select: { zoneIds: true, wardIds: true }
    });
    const resolvedZoneId = payload.zoneId || employeeCity?.zoneIds?.[0];
    const resolvedWardId = payload.wardId || employeeCity?.wardIds?.[0];
    if (!resolvedZoneId || !resolvedWardId) {
      throw new HttpError(400, "Zone and ward are required for a bin request");
    }
    await ensureGeoValid(cityId, resolvedZoneId, resolvedWardId);

    const bin = await prisma.litterBin.create({
      data: {
        cityId,
        requestedById: userId,
        zoneId: resolvedZoneId,
        wardId: resolvedWardId,
        areaName: payload.areaName,
        areaType: payload.areaType as any,
        locationName: payload.locationName,
        roadType: payload.roadType,
        isFixedProperly: payload.isFixedProperly,
        hasLid: payload.hasLid,
        condition: payload.condition as any,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: TwinbinBinStatus.PENDING_QC
      }
    });

    res.json({ bin });
  } catch (err) {
    next(err);
  }
});

router.get("/bins/my-requests", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bins = await prisma.litterBin.findMany({
      where: { cityId, requestedById: userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ bins });
  } catch (err) {
    next(err);
  }
});

router.get("/bins/pending", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    // allow only QC users who are assigned to the Twinbin module in this city
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const moduleRoles = await prisma.userModuleRole.findMany({
      where: { userId: qcId, cityId, moduleId, role: Role.QC },
      select: { zoneIds: true, wardIds: true }
    });
    const scope = {
      zoneIds: Array.from(new Set(moduleRoles.flatMap((r) => r.zoneIds || []))),
      wardIds: Array.from(new Set(moduleRoles.flatMap((r) => r.wardIds || [])))
    };
    const { zoneFilter, wardFilter } = buildScopeFilters(scope);
    const where: any = {
      cityId,
      status: TwinbinBinStatus.PENDING_QC
    };

    const conditions: any[] = [];
    if (zoneFilter) conditions.push(zoneFilter);
    if (wardFilter) conditions.push(wardFilter);

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const latest = await prisma.litterBin.findFirst({
      where: { cityId },
      orderBy: { createdAt: "desc" },
      select: { id: true, cityId: true, zoneId: true, wardId: true, status: true, createdAt: true }
    });

    console.info("[twinbin][pending] latest", latest);
    console.info("[twinbin][pending] qc scope", { qcId, cityId, zoneIds: scope.zoneIds, wardIds: scope.wardIds });
    console.info("[twinbin][pending] where", where);

    const bins = await prisma.litterBin.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } } // requester details for display
      }
    });

    console.info("[twinbin] pending bins", {
      cityId,
      qcId,
      count: bins.length,
      sample: bins.slice(0, 2).map((b) => ({ id: b.id, zoneId: b.zoneId, wardId: b.wardId }))
    }); // temp trace

    res.json({
      bins: bins.map((b: typeof bins[number]) => ({
        ...b,
        requestedBy: b.requestedBy
          ? { id: b.requestedBy.id, name: b.requestedBy.name, email: b.requestedBy.email }
          : null
      }))
    });
  } catch (err) {
    next(err);
  }
});


const approveSchema = z.object({
  assignedEmployeeIds: z.array(z.string().uuid()).optional()
});

router.post("/bins/:id/approve", validateBody(approveSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const { assignedEmployeeIds = [] } = req.body as z.infer<typeof approveSchema>;
    const bin = await prisma.litterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) throw new HttpError(403, "No zone/ward scope assigned");
    if (!bin.zoneId || !bin.wardId || !scope.zoneIds.includes(bin.zoneId) || !scope.wardIds.includes(bin.wardId)) {
      throw new HttpError(403, "Bin not in QC scope");
    }
    if (bin.status !== TwinbinBinStatus.PENDING_QC) throw new HttpError(400, "Bin not pending");

    if (assignedEmployeeIds.length) {
      const employees = await prisma.userCity.findMany({
        where: { cityId, userId: { in: assignedEmployeeIds }, role: Role.EMPLOYEE }
      });
      if (employees.length !== assignedEmployeeIds.length) throw new HttpError(400, "Invalid employee assignment");
    }

    const updated = await prisma.litterBin.update({
      where: { id: bin.id },
      data: {
        status: TwinbinBinStatus.APPROVED,
        approvedByQcId: userId,
        assignedEmployeeIds
      }
    });

    res.json({ bin: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/bins/:id/reject", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const bin = await prisma.litterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) throw new HttpError(403, "No zone/ward scope assigned");
    if (!bin.zoneId || !bin.wardId || !scope.zoneIds.includes(bin.zoneId) || !scope.wardIds.includes(bin.wardId)) {
      throw new HttpError(403, "Bin not in QC scope");
    }
    if (bin.status !== TwinbinBinStatus.PENDING_QC) throw new HttpError(400, "Bin not pending");

    const updated = await prisma.litterBin.update({
      where: { id: bin.id },
      data: { status: TwinbinBinStatus.REJECTED, approvedByQcId: userId, assignedEmployeeIds: [] }
    });

    res.json({ bin: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/bins/my", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const bins = await prisma.litterBin.findMany({
      where: { cityId, status: "APPROVED", assignedEmployeeIds: { has: userId } },
      orderBy: { createdAt: "desc" }
    });

    res.json({ bins });
  } catch (err) {
    next(err);
  }
});

router.get("/bins/assigned", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bins = await prisma.litterBin.findMany({
      where: { cityId, status: TwinbinBinStatus.APPROVED, assignedEmployeeIds: { has: userId } },
      orderBy: { createdAt: "desc" },
      include: {
        reports: {
          where: { cityId },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    res.json({
      bins: bins.map((b) => ({
        ...b,
        latestReport: b.reports[0] || null
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Pre-check distance before showing the report form
router.get("/bins/:id/report-context", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new HttpError(400, "lat and lon query params are required");
    }

    const bin = await prisma.litterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== TwinbinBinStatus.APPROVED) throw new HttpError(400, "Bin not approved");
    if (!bin.assignedEmployeeIds.includes(userId)) throw new HttpError(403, "Not assigned to this bin");
    if (!bin.latitude || !bin.longitude) throw new HttpError(400, "Bin location unavailable");

    const distance = haversineMeters(lat, lon, bin.latitude, bin.longitude);

    // Never send form config when user is too far; UI should keep form hidden
    if (distance > 50) {
      res.status(403).json({
        allowed: false,
        distanceMeters: distance,
        message: `Move closer to the bin. You are ${distance.toFixed(1)}m away.`,
        formConfig: null,
        proximityToken: null
      });
      return;
    }

    const token = signProximityToken({
      binId: bin.id,
      userId,
      lat,
      lon,
      exp: Date.now() + PROXIMITY_TTL_MS
    });

    res.json({
      allowed: true,
      distanceMeters: distance,
      bin: {
        id: bin.id,
        areaName: bin.areaName,
        areaType: bin.areaType,
        locationName: bin.locationName,
        roadType: bin.roadType,
        latitude: bin.latitude,
        longitude: bin.longitude
      },
      // form config kept lightweight; expand here if UI needs labels/options
      formConfig: {
        photoOptional: true,
        maxDistanceMeters: 50
      },
      proximityToken: token
    });
  } catch (err) {
    next(err);
  }
});

const visitSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  inspectionAnswers: z.object({
    q1: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q2: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q3: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q4: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q5: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q6: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q7: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q8: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q9: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() }),
    q10: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().optional() })
  })
});

router.post("/bins/:id/visit", validateBody(visitSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bin = await prisma.litterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== TwinbinBinStatus.APPROVED) throw new HttpError(400, "Bin not approved");
    if (!bin.assignedEmployeeIds.includes(userId)) throw new HttpError(403, "Not assigned to this bin");

    const payload = req.body as z.infer<typeof visitSchema>;
    const distance = haversineMeters(payload.latitude, payload.longitude, bin.latitude, bin.longitude);
    if (distance > 100)
      throw new HttpError(400, `You must be within 100 meters of the bin to submit. You are ${distance.toFixed(1)}m away.`);

    const report = await prisma.litterBinVisitReport.create({
      data: {
        cityId,
        binId: bin.id,
        submittedById: userId,
        visitedAt: new Date(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        distanceMeters: distance,
        inspectionAnswers: payload.inspectionAnswers,
        status: "PENDING_QC"
      }
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

router.get("/visits/pending", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const moduleRoles = await prisma.userModuleRole.findMany({
      where: { userId: qcId, cityId, moduleId, role: Role.QC },
      select: { zoneIds: true, wardIds: true }
    });
    const scope = {
      zoneIds: Array.from(new Set(moduleRoles.flatMap((r) => r.zoneIds || []))),
      wardIds: Array.from(new Set(moduleRoles.flatMap((r) => r.wardIds || [])))
    };
    const { zoneFilter, wardFilter } = buildScopeFilters(scope);
    const where: any = {
      cityId,
      status: "PENDING_QC",
      bin: {
        AND: [
          ...(zoneFilter ? [zoneFilter] : []),
          ...(wardFilter ? [wardFilter] : [])
        ]
      }
    };
    if (!zoneFilter && !wardFilter) delete where.bin;

    console.info("[twinbin][visits][pending] scope", scope);
    console.info("[twinbin][visits][pending] where", where);

    const visits = await prisma.litterBinVisitReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        bin: true,
        submittedBy: { select: { id: true, name: true, email: true } }
      }
    });

    const formatted = visits.map((v) => ({
      ...v,
      distanceMeters: v.distanceMeters ?? haversineMeters(v.latitude, v.longitude, v.bin.latitude, v.bin.longitude)
    }));

    res.json({ visits: formatted });
  } catch (err) {
    next(err);
  }
});

router.post("/visits/:id/approve", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const visit = await prisma.litterBinVisitReport.findUnique({
      where: { id: req.params.id },
      include: { bin: true }
    });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !visit.bin?.zoneId ||
      !visit.bin?.wardId ||
      !scope.zoneIds.includes(visit.bin.zoneId) ||
      !scope.wardIds.includes(visit.bin.wardId)
    ) {
      throw new HttpError(403, "Visit not in QC scope");
    }
    if (visit.status !== "PENDING_QC") throw new HttpError(400, "Visit not pending");

    const updated = await prisma.litterBinVisitReport.update({
      where: { id: visit.id },
      data: { status: "APPROVED", reviewedByQcId: userId, actionStatus: "APPROVED" }
    });

    res.json({ visit: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/visits/:id/reject", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const visit = await prisma.litterBinVisitReport.findUnique({
      where: { id: req.params.id },
      include: { bin: true }
    });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !visit.bin?.zoneId ||
      !visit.bin?.wardId ||
      !scope.zoneIds.includes(visit.bin.zoneId) ||
      !scope.wardIds.includes(visit.bin.wardId)
    ) {
      throw new HttpError(403, "Visit not in QC scope");
    }
    if (visit.status !== "PENDING_QC") throw new HttpError(400, "Visit not pending");

    const updated = await prisma.litterBinVisitReport.update({
      where: { id: visit.id },
      data: { status: "REJECTED", reviewedByQcId: userId, actionStatus: "REJECTED" }
    });

    res.json({ visit: updated });
  } catch (err) {
    next(err);
  }
});

const actionRequiredSchema = z.object({
  qcRemark: z.string().min(1)
});

router.post("/visits/:id/action-required", validateBody(actionRequiredSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const visit = await prisma.litterBinVisitReport.findUnique({
      where: { id: req.params.id },
      include: { bin: true }
    });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !visit.bin?.zoneId ||
      !visit.bin?.wardId ||
      !scope.zoneIds.includes(visit.bin.zoneId) ||
      !scope.wardIds.includes(visit.bin.wardId)
    ) {
      throw new HttpError(403, "Visit not in QC scope");
    }

    const updated = await prisma.litterBinVisitReport.update({
      where: { id: visit.id },
      data: { actionStatus: "ACTION_REQUIRED", qcRemark: req.body.qcRemark, reviewedByQcId: userId }
    });

    res.json({ visit: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/visits/action-required", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

    const visits = await prisma.litterBinVisitReport.findMany({
      where: { cityId, actionStatus: "ACTION_REQUIRED" },
      orderBy: { createdAt: "desc" },
      include: {
        bin: true,
        submittedBy: { select: { id: true, name: true, email: true } },
        reviewedByQc: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ visits });
  } catch (err) {
    next(err);
  }
});

const actionTakenSchema = z.object({
  actionRemark: z.string().min(1),
  actionPhotoUrl: z.string().min(1)
});

router.post("/visits/:id/action-taken", validateBody(actionTakenSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

    const visit = await prisma.litterBinVisitReport.findUnique({ where: { id: req.params.id } });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    if (visit.actionStatus !== "ACTION_REQUIRED") throw new HttpError(400, "Visit not pending action");

    const updated = await prisma.litterBinVisitReport.update({
      where: { id: visit.id },
      data: {
        actionStatus: "ACTION_TAKEN",
        actionRemark: req.body.actionRemark,
        actionPhotoUrl: req.body.actionPhotoUrl,
        actionTakenById: userId,
        actionTakenAt: new Date()
      }
    });

    res.json({ visit: updated });
  } catch (err) {
    next(err);
  }
});

const binReportSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  questionnaire: z.any(),
  proximityToken: z.string().min(1)
});

type ProximityPayload = {
  binId: string;
  userId: string;
  lat: number;
  lon: number;
  exp: number;
};

function signProximityToken(payload: ProximityPayload) {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", PROXIMITY_SECRET);
  hmac.update(data);
  const sig = hmac.digest("base64url");
  return Buffer.from(data).toString("base64url") + "." + sig;
}

function verifyProximityToken(token: string): ProximityPayload | null {
  const [dataB64, sig] = token.split(".");
  if (!dataB64 || !sig) return null;
  const data = Buffer.from(dataB64, "base64url").toString();
  const hmac = crypto.createHmac("sha256", PROXIMITY_SECRET);
  hmac.update(data);
  const expected = hmac.digest("base64url");
  if (expected !== sig) return null;
  const payload = JSON.parse(data) as ProximityPayload;
  if (Date.now() > payload.exp) return null;
  return payload;
}

router.post("/bins/:id/report", validateBody(binReportSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bin = await prisma.litterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== "APPROVED") throw new HttpError(400, "Bin not approved");
    if (!bin.assignedEmployeeIds.includes(userId)) throw new HttpError(403, "Not assigned to this bin");

    if (!bin.latitude || !bin.longitude) throw new HttpError(400, "Bin location unavailable");

    const payload = req.body as z.infer<typeof binReportSchema>;
    const tokenPayload = verifyProximityToken(payload.proximityToken);
    if (!tokenPayload || tokenPayload.binId !== bin.id || tokenPayload.userId !== userId) {
      throw new HttpError(403, "Location verification required. Please refresh location near the bin.");
    }

    const distanceFromToken = haversineMeters(tokenPayload.lat, tokenPayload.lon, bin.latitude, bin.longitude);
    if (distanceFromToken > 50) {
      throw new HttpError(
        403,
        `You must be within 50 meters of the bin to submit. You are ${distanceFromToken.toFixed(1)}m away (token).`
      );
    }

    const distance = haversineMeters(payload.latitude, payload.longitude, bin.latitude, bin.longitude);
    if (distance > 50) {
      throw new HttpError(
        403,
        `You must be within 50 meters of the bin to submit. You are ${distance.toFixed(1)}m away.`
      );
    }

    const report = await prisma.litterBinReport.create({
      data: {
        cityId,
        binId: bin.id,
        submittedById: userId,
        reviewedByQcId: null,
        status: "SUBMITTED",
        latitude: payload.latitude,
        longitude: payload.longitude,
        distanceMeters: distance,
        questionnaire: payload.questionnaire
      }
    });

    res.json({ report });
  } catch (err) {
    next(err);
  }
});

router.get("/reports/pending", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const moduleRoles = await prisma.userModuleRole.findMany({
      where: { userId: qcId, cityId, moduleId, role: Role.QC },
      select: { zoneIds: true, wardIds: true }
    });
    const scope = {
      zoneIds: Array.from(new Set(moduleRoles.flatMap((r) => r.zoneIds || []))),
      wardIds: Array.from(new Set(moduleRoles.flatMap((r) => r.wardIds || [])))
    };
    const { zoneFilter, wardFilter } = buildScopeFilters(scope);
    const where: any = {
      cityId,
      status: "SUBMITTED",
      bin: {
        AND: [
          ...(zoneFilter ? [zoneFilter] : []),
          ...(wardFilter ? [wardFilter] : [])
        ]
      }
    };
    if (!zoneFilter && !wardFilter) delete where.bin;

    console.info("[twinbin][reports][pending] scope", scope);
    console.info("[twinbin][reports][pending] where", where);

    const reports = await prisma.litterBinReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        bin: {
          select: {
            id: true,
            areaName: true,
            areaType: true,
            locationName: true,
            roadType: true,
            latitude: true,
            longitude: true
          }
        },
        submittedBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

async function updateBinReportStatus(
  req: any,
  res: any,
  next: any,
  status: "APPROVED" | "REJECTED" | "ACTION_REQUIRED"
) {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const report = await prisma.litterBinReport.findUnique({
      where: { id: req.params.id },
      include: { bin: true }
    });
    if (!report || report.cityId !== cityId) throw new HttpError(404, "Report not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !report.bin?.zoneId ||
      !report.bin?.wardId ||
      !scope.zoneIds.includes(report.bin.zoneId) ||
      !scope.wardIds.includes(report.bin.wardId)
    ) {
      throw new HttpError(403, "Report not in QC scope");
    }
    if (report.status !== "SUBMITTED") throw new HttpError(400, "Report not pending review");

    const updated = await prisma.litterBinReport.update({
      where: { id: report.id },
      data: { status, reviewedByQcId: userId, reviewedAt: new Date() }
    });

    res.json({ report: updated });
  } catch (err) {
    next(err);
  }
}

router.post("/reports/:id/approve", (req, res, next) => updateBinReportStatus(req, res, next, "APPROVED"));
router.post("/reports/:id/reject", (req, res, next) => updateBinReportStatus(req, res, next, "REJECTED"));
router.post("/reports/:id/action-required", (req, res, next) =>
  updateBinReportStatus(req, res, next, "ACTION_REQUIRED")
);

export default router;
