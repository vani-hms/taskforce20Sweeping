import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
import { validateBody } from "../../utils/validation";
import { Role, $Enums } from "../../../generated/prisma";
import { HttpError } from "../../utils/errors";
import { getModuleIdByName } from "../moduleRegistry";
import { getQcScope } from "../../utils/qcScope";

const router = Router();
router.use(authenticate, requireCityContext());
const MODULE_KEY = "TASKFORCE";

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

async function ensureModuleEnabled(cityId: string, moduleId: string) {
  const cm = await prisma.cityModule.findUnique({ where: { cityId_moduleId: { cityId, moduleId } } });
  if (!cm || !cm.enabled) throw new HttpError(400, "Module not enabled for this city");
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

const feederRequestSchema = z.object({
  zoneId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  zoneName: z.string().min(1).optional(),
  wardName: z.string().min(1).optional(),
  areaName: z.string().min(1),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]),
  feederPointName: z.string().min(1),
  locationDescription: z.string().min(1),
  populationDensity: z.string().min(1),
  accessibilityLevel: z.string().min(1),
  householdsCount: z.number().int().nonnegative(),
  vehicleType: z.string().min(1),
  landmark: z.string().min(1),
  photoUrl: z.string().min(1),
  notes: z.string().optional(),
  latitude: z.number(),
  longitude: z.number()
});

router.post("/feeder-points/request", validateBody(feederRequestSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);
    await ensureModuleEnabled(cityId, moduleId);

    const payload = req.body as z.infer<typeof feederRequestSchema>;

    // Resolve zone/ward from payload or user scope (auth first, then employee assignment)
    const employeeCity = await prisma.userCity.findFirst({
      where: { userId, cityId, role: Role.EMPLOYEE },
      select: { zoneIds: true, wardIds: true }
    });

    const authZoneIds = (req.auth as any)?.zoneIds || [];
    const authWardIds = (req.auth as any)?.wardIds || [];
    const scopeZoneIds = authZoneIds.length ? authZoneIds : employeeCity?.zoneIds || [];
    const scopeWardIds = authWardIds.length ? authWardIds : employeeCity?.wardIds || [];

    let resolvedZoneId = payload.zoneId ?? scopeZoneIds[0];
    let resolvedWardId = payload.wardId ?? scopeWardIds[0];

    console.log({
      employeeId: userId,
      employeeZoneIds: scopeZoneIds,
      employeeWardIds: scopeWardIds,
      payloadZoneId: payload.zoneId,
      payloadWardId: payload.wardId,
      resolvedZoneId,
      resolvedWardId
    });

    if (!resolvedZoneId || !resolvedWardId) {
      throw new HttpError(400, "Zone and Ward are required. Please select them or contact admin for assignment.");
    }

    await ensureGeoValid(cityId, resolvedZoneId, resolvedWardId);

    const feederPoint = await prisma.taskforceFeederPoint.create({
      data: {
        cityId,
        requestedById: userId,
        zoneId: resolvedZoneId,
        wardId: resolvedWardId,
        areaName: payload.areaName,
        areaType: payload.areaType as any,
        zoneName: payload.zoneName || "",
        wardName: payload.wardName || "",
        feederPointName: payload.feederPointName,
        locationDescription: payload.locationDescription,
        populationDensity: payload.populationDensity,
        accessibilityLevel: payload.accessibilityLevel,
        householdsCount: payload.householdsCount,
        vehicleType: payload.vehicleType,
        landmark: payload.landmark,
        photoUrl: payload.photoUrl,
        notes: payload.notes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: "PENDING_QC"
      }
    });


    res.json({ feederPoint });
  } catch (err) {
    next(err);
  }
});

router.get("/feeder-points/pending", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const scope = await getQcScope({ userId: qcId, cityId, moduleId });
    console.log("QC AUTH CONTEXT", {
      qcId: req.auth?.sub,
      cityId: req.auth?.cityId,
      zoneIds: (req.auth as any)?.zoneIds || [],
      wardIds: (req.auth as any)?.wardIds || []
    });
    if (!scope.zoneIds.length || !scope.wardIds.length) {
      console.log("[taskforce][feeder-points/pending] Empty QC scope, returning no data");
      return res.json({ feederPoints: [] });
    }

    const totalCity = await prisma.taskforceFeederPoint.count({ where: { cityId } });
    const totalPendingCity = await prisma.taskforceFeederPoint.count({ where: { cityId, status: "PENDING_QC" } });
    // Strictly filter by city + scope + pending status (no requester/module filters)
    const whereClause = {
      cityId,
      status: "PENDING_QC" as const,
      zoneId: { in: scope.zoneIds },
      wardId: { in: scope.wardIds }
    };
    const totalInCity = await prisma.taskforceFeederPoint.count({ where: { cityId } });
    const scopedCount = await prisma.taskforceFeederPoint.count({ where: whereClause });
    console.log("QC FEEDER PENDING DEBUG", {
      qcCityId: cityId,
      qcZoneIds: scope.zoneIds,
      qcWardIds: scope.wardIds,
      where: whereClause,
      totalInCity,
      scopedCount
    });

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true, email: true } } }
    });

    res.json({ feederPoints });
  } catch (err) {
    next(err);
  }
});

router.get("/feeder-points/approved", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const scope = await getQcScope({ userId: qcId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) {
      return res.json({ feederPoints: [] });
    }

    const assignedParam = (req.query.assigned as string | undefined)?.toLowerCase();
    const includeAssigned = assignedParam === "true";

    const whereClause = {
      cityId,
      status: "APPROVED" as const,
      zoneId: { in: scope.zoneIds },
      wardId: { in: scope.wardIds },
      assignedEmployeeIds: includeAssigned ? { isEmpty: false } : { isEmpty: true }
    };
    const allApprovedInCity = await prisma.taskforceFeederPoint.count({ where: { cityId, status: "APPROVED" } });
    const scopedApproved = await prisma.taskforceFeederPoint.count({ where: whereClause });
    console.log("APPROVED QUERY", {
      qcId: qcId,
      qcCityId: cityId,
      qcZoneIds: scope.zoneIds,
      qcWardIds: scope.wardIds,
      whereClause,
      allApprovedInCity,
      scopedApproved
    });

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true, email: true } } }
    });

    res.json({ feederPoints: feederPoints.map(toAssignedStatus) });
  } catch (err) {
    next(err);
  }
});

// Generic list with status filter (used by frontend Approved tab)
router.get("/feeder-points", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const scope = await getQcScope({ userId: qcId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) {
      return res.json({ feederPoints: [] });
    }

    const statusParam = (req.query.status as string | undefined) || "PENDING_QC";
    const allowedStatuses: $Enums.TaskforceRequestStatus[] = [
      "PENDING_QC",
      "APPROVED",
      "REJECTED",
      "ACTION_REQUIRED"
    ];
    const status: $Enums.TaskforceRequestStatus = allowedStatuses.includes(statusParam as any)
      ? (statusParam as $Enums.TaskforceRequestStatus)
      : "PENDING_QC";
    const whereClause = {
      cityId,
      status,
      zoneId: { in: scope.zoneIds },
      wardId: { in: scope.wardIds }
    };

    const totalInCity = await prisma.taskforceFeederPoint.count({ where: { cityId, status } });
    const scopedCount = await prisma.taskforceFeederPoint.count({ where: whereClause });
    console.log("FEEDER LIST QUERY", { qcId, status, whereClause, totalInCity, scopedCount });

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true, email: true } } }
    });

    res.json({ feederPoints });
  } catch (err) {
    next(err);
  }
});

router.get("/feeder-points/requests", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const scope = await getQcScope({ userId: qcId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) {
      return res.json({ feederPoints: [] });
    }

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: {
        cityId,
        zoneId: { in: scope.zoneIds },
        wardId: { in: scope.wardIds }
      },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true, email: true } } }
    });

    res.json({ feederPoints });
  } catch (err) {
    next(err);
  }
});

router.get("/feeder-points/my-requests", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: { cityId, requestedById: userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ feederPoints });
  } catch (err) {
    next(err);
  }
});

const approveSchema = feederRequestSchema
  .partial()
  .extend({
    assignedEmployeeIds: z.array(z.string().uuid()).optional(),
    status: z.enum(["APPROVED", "PENDING_QC", "REJECTED", "ACTION_REQUIRED"]).optional()
  });

router.post("/feeder-points/:id/approve", validateBody(approveSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !feederPoint.zoneId ||
      !feederPoint.wardId ||
      !scope.zoneIds.includes(feederPoint.zoneId) ||
      !scope.wardIds.includes(feederPoint.wardId)
    ) {
      throw new HttpError(403, "Feeder point not in QC scope");
    }
    if (feederPoint.status !== "PENDING_QC") throw new HttpError(400, "Feeder point not pending QC");

    const {
      assignedEmployeeIds = [],
      status = "APPROVED",
      ...updates
    } = req.body as z.infer<typeof approveSchema>;
    if (assignedEmployeeIds.length) {
      const employees = await prisma.userCity.findMany({
        where: { cityId, userId: { in: assignedEmployeeIds }, role: Role.EMPLOYEE }
      });
      if (employees.length !== assignedEmployeeIds.length) throw new HttpError(400, "Invalid employee assignment");
    }

    const updated = await prisma.taskforceFeederPoint.update({
      where: { id: feederPoint.id },
      data: {
        ...updates,
        status,
        approvedByQcId: userId,
        assignedEmployeeIds
      }
    });
    console.log("AFTER APPROVE", updated.id, updated.status);

    res.json({ feederPoint: updated });
  } catch (err) {
    next(err);
  }
});

function toAssignedStatus(feederPoint: any) {
  if ((feederPoint.assignedEmployeeIds || []).length === 0) return feederPoint;
  return {
    ...feederPoint,
    status: "ASSIGNED",
    assignedAt: feederPoint.updatedAt
  } as any;
}

async function handleAssign(req: any, res: any, next: any) {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id } });
    console.log("[taskforce][assign] request", { feederPointId: req.params.id, cityId, qcId: userId, found: !!feederPoint });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !feederPoint.zoneId ||
      !feederPoint.wardId ||
      !scope.zoneIds.includes(feederPoint.zoneId) ||
      !scope.wardIds.includes(feederPoint.wardId)
    ) {
      throw new HttpError(403, "Feeder point not in QC scope");
    }
    if (feederPoint.status !== "APPROVED") throw new HttpError(400, "Feeder point must be APPROVED to assign");

    const { employeeId } = req.body as { employeeId?: string };
    if (!employeeId) throw new HttpError(400, "employeeId is required");

    const employee = await prisma.userCity.findFirst({
      where: { cityId, userId: employeeId, role: Role.EMPLOYEE }
    });
    if (!employee) throw new HttpError(400, "Invalid employee for this city");

    // Single assignment (latest overwrites) per requirements
    const updatedAssignees = [employeeId];

    const updated = await prisma.taskforceFeederPoint.update({
      where: { id: feederPoint.id },
      data: {
        assignedEmployeeIds: updatedAssignees
      }
    });

    res.json({ success: true, feederPoint: toAssignedStatus(updated) });
  } catch (err) {
    next(err);
  }
}

// Assignment endpoints (primary + alias)
router.post("/feeder-points/:id/assign", (req, res, next) => {
  handleAssign(req, res, next);
});
router.post("/feeder-points/assign/:id", (req, res, next) => {
  handleAssign(req, res, next);
});

router.post("/feeder-points/:id/reject", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id as string } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !feederPoint.zoneId ||
      !feederPoint.wardId ||
      !scope.zoneIds.includes(feederPoint.zoneId) ||
      !scope.wardIds.includes(feederPoint.wardId)
    ) {
      throw new HttpError(403, "Feeder point not in QC scope");
    }
    if (feederPoint.status !== "PENDING_QC") throw new HttpError(400, "Feeder point not pending QC");

    const updated = await prisma.taskforceFeederPoint.update({
      where: { id: feederPoint.id },
      data: { status: "REJECTED", approvedByQcId: userId, assignedEmployeeIds: [] }
    });

    res.json({ feederPoint: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/feeder-points/:id/action-required", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id as string } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !feederPoint.zoneId ||
      !feederPoint.wardId ||
      !scope.zoneIds.includes(feederPoint.zoneId) ||
      !scope.wardIds.includes(feederPoint.wardId)
    ) {
      throw new HttpError(403, "Feeder point not in QC scope");
    }
    if (feederPoint.status !== "PENDING_QC") throw new HttpError(400, "Feeder point not pending QC");

    const updated = await prisma.taskforceFeederPoint.update({
      where: { id: feederPoint.id },
      data: { status: "ACTION_REQUIRED", approvedByQcId: userId }
    });

    res.json({ feederPoint: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/feeder-points/assigned", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: { cityId, status: "APPROVED", assignedEmployeeIds: { has: userId } },
      orderBy: { updatedAt: "desc" }
    });

    res.json({ feederPoints: feederPoints.map(toAssignedStatus) });
  } catch (err) {
    next(err);
  }
});

// Alias for clarity: tasks assigned to the logged-in Taskforce member
router.get("/feeder-points/my-tasks", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: { cityId, status: "APPROVED", assignedEmployeeIds: { has: userId } },
      orderBy: { updatedAt: "desc" }
    });

    res.json({ feederPoints: feederPoints.map(toAssignedStatus) });
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  payload: z.any()
});

router.post("/feeder-points/:id/report", validateBody(reportSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id as string } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
    if (feederPoint.status !== "APPROVED") throw new HttpError(400, "Feeder point not approved");
    if (!feederPoint.assignedEmployeeIds.includes(userId)) {
      throw new HttpError(403, "Not assigned to this feeder point");
    }

    const payload = req.body as z.infer<typeof reportSchema>;
    const distance = haversineMeters(payload.latitude, payload.longitude, feederPoint.latitude, feederPoint.longitude);
    if (distance > 100) throw new HttpError(403, "You must be within 100 meters of the feeder point to submit");

    const report = await prisma.taskforceFeederReport.create({
      data: {
        feederPointId: feederPoint.id,
        cityId,
        submittedById: userId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        distanceMeters: distance,
        payload: payload.payload,
        status: "SUBMITTED"
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
    await ensureModuleEnabled(cityId, moduleId);

    const scope = await getQcScope({ userId: qcId, cityId, moduleId });
    if (!scope.zoneIds.length || !scope.wardIds.length) {
      return res.json({ reports: [] });
    }

    const reports = await prisma.taskforceFeederReport.findMany({
      where: {
        cityId,
        status: "SUBMITTED",
        feederPoint: {
          zoneId: { in: scope.zoneIds },
          wardId: { in: scope.wardIds }
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        feederPoint: {
          select: {
            id: true,
            feederPointName: true,
            areaName: true,
            areaType: true,
            locationDescription: true,
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

async function updateReportStatus(
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
    await ensureModuleEnabled(cityId, moduleId);

    const report = await prisma.taskforceFeederReport.findUnique({
      where: { id: req.params.id as string },
      include: { feederPoint: true }
    });
    if (!report || report.cityId !== cityId) {
      // Safety guard: if this id belongs to LitterBins, return a clear module mismatch message
      const twinbinReport = await prisma.litterBinReport.findUnique({ where: { id: req.params.id } });
      if (twinbinReport) {
        throw new HttpError(400, "This report belongs to LitterBins. Use /modules/twinbin/reports APIs.");
      }
      throw new HttpError(404, "Report not found");
    }
    const scope = await getQcScope({ userId, cityId, moduleId });
    if (
      !scope.zoneIds.length ||
      !scope.wardIds.length ||
      !report.feederPoint?.zoneId ||
      !report.feederPoint?.wardId ||
      !scope.zoneIds.includes(report.feederPoint.zoneId) ||
      !scope.wardIds.includes(report.feederPoint.wardId)
    ) {
      throw new HttpError(403, "Report not in QC scope");
    }
    if (report.status !== "SUBMITTED") throw new HttpError(400, "Report not pending review");

    const updated = await prisma.taskforceFeederReport.update({
      where: { id: report.id },
      data: {
        status,
        reviewedByQcId: userId,
        reviewedAt: new Date()
      }
    });

    res.json({ report: updated });
  } catch (err) {
    next(err);
  }
}

router.post("/reports/:id/approve", (req, res, next) => updateReportStatus(req, res, next, "APPROVED"));
router.post("/reports/:id/reject", (req, res, next) => updateReportStatus(req, res, next, "REJECTED"));
router.post("/reports/:id/action-required", (req, res, next) => updateReportStatus(req, res, next, "ACTION_REQUIRED"));

const createSchema = z.object({
  title: z.string().min(1),
  status: z.string().default("OPEN"),
  geoNodeId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional()
});

router.post("/cases", validateBody(createSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);
    await ensureModuleEnabled(cityId, moduleId);

    const { title, status, geoNodeId, assignedTo } = req.body as z.infer<typeof createSchema>;
    if (geoNodeId) {
      const node = await prisma.geoNode.findUnique({ where: { id: geoNodeId } });
      if (!node || node.cityId !== cityId) throw new HttpError(400, "Invalid geo node");
    }
    const caseRecord = await prisma.taskforceCase.create({
      data: {
        cityId,
        moduleId,
        title,
        status,
        geoNodeId: geoNodeId || null,
        assignedTo,
        createdBy: req.auth!.sub
      }
    });
    await prisma.taskforceActivity.create({
      data: {
        cityId,
        moduleId,
        caseId: caseRecord.id,
        actorId: req.auth!.sub,
        action: "CREATE",
        metadata: { status }
      }
    });
    res.json({ case: caseRecord });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.string().min(1),
  assignedTo: z.string().uuid().optional()
});

router.patch("/cases/:id", validateBody(statusSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);
    await ensureModuleEnabled(cityId, moduleId);

    const caseRecord = await prisma.taskforceCase.findUnique({ where: { id: req.params.id as string } });
    if (!caseRecord || caseRecord.cityId !== cityId) throw new HttpError(404, "Case not found");

    const { status, assignedTo } = req.body as z.infer<typeof statusSchema>;
    const updated = await prisma.taskforceCase.update({
      where: { id: req.params.id as string },
      data: { status, assignedTo }
    });

    await prisma.taskforceActivity.create({
      data: {
        cityId,
        moduleId,
        caseId: updated.id,
        actorId: req.auth!.sub,
        action: "UPDATE",
        metadata: { status, assignedTo }
      }
    });

    res.json({ case: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/cases", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [
      Role.EMPLOYEE,
      Role.QC,
      Role.ACTION_OFFICER,
      Role.CITY_ADMIN,
      Role.COMMISSIONER
    ]);
    await ensureModuleEnabled(cityId, moduleId);

    const cases = await prisma.taskforceCase.findMany({
      where: { cityId, moduleId },
      include: { activities: true }
    });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
});

const activitySchema = z.object({
  action: z.string().min(1),
  metadata: z.any().optional()
});

router.post("/cases/:id/activity", validateBody(activitySchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);
    await ensureModuleEnabled(cityId, moduleId);

    const caseRecord = await prisma.taskforceCase.findUnique({ where: { id: req.params.id as string } });
    if (!caseRecord || caseRecord.cityId !== cityId) throw new HttpError(404, "Case not found");

    const { action, metadata } = req.body as z.infer<typeof activitySchema>;
    const activity = await prisma.taskforceActivity.create({
      data: {
        cityId,
        moduleId,
        caseId: caseRecord.id,
        actorId: req.auth!.sub,
        action,
        metadata
      }
    });
    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

router.get("/records", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC, Role.COMMISSIONER]);
    await ensureModuleEnabled(cityId, moduleId);

    // 1. Determine Scope
    const isCityAdmin = req.auth?.roles?.some(r => [Role.CITY_ADMIN, Role.COMMISSIONER, Role.HMS_SUPER_ADMIN, "ULB_OFFICER"].includes(r));
    let zoneFilter: string[] | undefined;
    let wardFilter: string[] | undefined;

    if (!isCityAdmin) {
      // Must differ to QC scope logic strictly
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (!scope.zoneIds.length && !scope.wardIds.length) {
        // No scope assigned -> No records
        return res.json({
          data: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
          stats: { pending: 0, approved: 0, rejected: 0, actionRequired: 0, total: 0 }
        });
      }
      zoneFilter = scope.zoneIds;
      wardFilter = scope.wardIds;
    }

    // 2. Pagination & Tab Params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const tab = (req.query.tab as string) || 'PENDING'; // DAILY_REPORTS, PENDING, APPROVED, REJECTED, HISTORY

    // 3. Build Filters
    const pointWhere: any = { cityId };
    const reportWhere: any = { cityId };

    if (zoneFilter || wardFilter) {
      const geoFilter = {
        OR: [
          ...(zoneFilter?.length ? [{ zoneId: { in: zoneFilter } }] : []),
          ...(wardFilter?.length ? [{ wardId: { in: wardFilter } }] : [])
        ]
      };
      // Feeder Point relation to Geo
      pointWhere.AND = [geoFilter];

      // Report relation to Geo (via feederPoint)
      reportWhere.feederPoint = {
        OR: [
          ...(zoneFilter?.length ? [{ zoneId: { in: zoneFilter } }] : []),
          ...(wardFilter?.length ? [{ wardId: { in: wardFilter } }] : [])
        ]
      };
    }

    // 4. Tab Specific Queries
    let data: any[] = [];
    let totalRecords = 0;

    if (tab === 'DAILY_REPORTS') {
      // Only Reports (Submitted today? Or just all reports usually shown in Daily Reports?)
      // Consistent with LitterBins which shows Visits in Daily Reports -> Here we show Feeder Reports
      const [reports, total] = await Promise.all([
        prisma.taskforceFeederReport.findMany({
          where: { ...reportWhere, status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED', 'ACTION_REQUIRED'] } }, // Show all reports? Or just submitted? "Daily Reports" usually implies recent activity. Let's show all for now but ordered by date.
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          include: {
            feederPoint: { select: { id: true, areaName: true, locationDescription: true, zoneName: true, wardName: true } }
          }
        }),
        prisma.taskforceFeederReport.count({ where: reportWhere })
      ]);
      data = reports.map(r => ({
        id: r.id,
        type: 'FEEDER_REPORT',
        status: r.status,
        areaName: r.feederPoint?.areaName,
        locationName: r.feederPoint?.locationDescription,
        zoneName: r.feederPoint?.zoneName,
        wardName: r.feederPoint?.wardName,
        createdAt: r.createdAt
      }));
      totalRecords = total;

    } else if (tab === 'PENDING') {
      // Pending Points (PENDING_QC) + Pending Reports (SUBMITTED)
      const pWhere = { ...pointWhere, status: 'PENDING_QC' };
      const rWhere = { ...reportWhere, status: 'SUBMITTED' };

      const [points, reports, pCount, rCount] = await Promise.all([
        prisma.taskforceFeederPoint.findMany({ where: pWhere, orderBy: { createdAt: 'desc' }, take: limit, skip }), // Naive pagination for combined list
        prisma.taskforceFeederReport.findMany({
          where: rWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          include: { feederPoint: { select: { id: true, areaName: true, locationDescription: true, zoneName: true, wardName: true } } }
        }),
        prisma.taskforceFeederPoint.count({ where: pWhere }),
        prisma.taskforceFeederReport.count({ where: rWhere })
      ]);

      // Combine and slice (Not perfect deep pagination but better than nothing for combined tabs)
      // For exact pagination on combined lists we usually need a UNION query or fetch IDs first.
      // Given time constraint, we'll map and sort and slice.
      // Actually, fetching limit from BOTH and then slicing is the standard easy way if total < 500.
      // If high volume, this tab might need splitting or more complex query.
      // Let's rely on client seeing mixed results.

      const mappedPoints = points.map(p => ({
        id: p.id,
        type: 'FEEDER_POINT',
        status: p.status,
        areaName: p.areaName,
        locationName: p.feederPointName,
        zoneName: p.zoneName,
        wardName: p.wardName,
        createdAt: p.createdAt
      }));

      const mappedReports = reports.map(r => ({
        id: r.id,
        type: 'FEEDER_REPORT',
        status: r.status === 'SUBMITTED' ? 'PENDING_QC' : r.status,
        areaName: r.feederPoint?.areaName,
        locationName: r.feederPoint?.locationDescription,
        zoneName: r.feederPoint?.zoneName,
        wardName: r.feederPoint?.wardName,
        createdAt: r.createdAt
      }));

      data = [...mappedPoints, ...mappedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
      totalRecords = pCount + rCount;

    } else if (tab === 'APPROVED') {
      const pWhere = { ...pointWhere, status: 'APPROVED' };
      const rWhere = { ...reportWhere, status: 'APPROVED' };
      // Similar logic...
      const [points, reports, pCount, rCount] = await Promise.all([
        prisma.taskforceFeederPoint.findMany({ where: pWhere, orderBy: { createdAt: 'desc' }, take: limit, skip }),
        prisma.taskforceFeederReport.findMany({
          where: rWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
          include: { feederPoint: true }
        }),
        prisma.taskforceFeederPoint.count({ where: pWhere }),
        prisma.taskforceFeederReport.count({ where: rWhere })
      ]);
      const mappedPoints = points.map(p => ({
        id: p.id, type: 'FEEDER_POINT', status: p.status, areaName: p.areaName, locationName: p.feederPointName, zoneName: p.zoneName, wardName: p.wardName, createdAt: p.createdAt
      }));
      const mappedReports = reports.map(r => ({
        id: r.id, type: 'FEEDER_REPORT', status: r.status, areaName: r.feederPoint?.areaName, locationName: r.feederPoint?.locationDescription, zoneName: r.feederPoint?.zoneName, wardName: r.feederPoint?.wardName, createdAt: r.createdAt
      }));
      data = [...mappedPoints, ...mappedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
      totalRecords = pCount + rCount;

    } else if (tab === 'REJECTED') {
      const pWhere = { ...pointWhere, status: 'REJECTED' };
      const rWhere = { ...reportWhere, status: 'REJECTED' };
      const [points, reports, pCount, rCount] = await Promise.all([
        prisma.taskforceFeederPoint.findMany({ where: pWhere, orderBy: { createdAt: 'desc' }, take: limit, skip }),
        prisma.taskforceFeederReport.findMany({ where: rWhere, orderBy: { createdAt: 'desc' }, take: limit, skip, include: { feederPoint: true } }),
        prisma.taskforceFeederPoint.count({ where: pWhere }),
        prisma.taskforceFeederReport.count({ where: rWhere })
      ]);
      // ... mapping ...
      const mappedPoints = points.map(p => ({
        id: p.id, type: 'FEEDER_POINT', status: p.status, areaName: p.areaName, locationName: p.feederPointName, zoneName: p.zoneName, wardName: p.wardName, createdAt: p.createdAt
      }));
      const mappedReports = reports.map(r => ({
        id: r.id, type: 'FEEDER_REPORT', status: r.status, areaName: r.feederPoint?.areaName, locationName: r.feederPoint?.locationDescription, zoneName: r.feederPoint?.zoneName, wardName: r.feederPoint?.wardName, createdAt: r.createdAt
      }));
      data = [...mappedPoints, ...mappedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
      totalRecords = pCount + rCount;
    } else {
      // HISTORY (ALL)
      // Expensive query, limit heavily.
      // For History, maybe just fetch last X items of any status?
      const [points, reports, pCount, rCount] = await Promise.all([
        prisma.taskforceFeederPoint.findMany({ where: pointWhere, orderBy: { createdAt: 'desc' }, take: limit, skip }),
        prisma.taskforceFeederReport.findMany({ where: reportWhere, orderBy: { createdAt: 'desc' }, take: limit, skip, include: { feederPoint: true } }),
        prisma.taskforceFeederPoint.count({ where: pointWhere }),
        prisma.taskforceFeederReport.count({ where: reportWhere })
      ]);
      const mappedPoints = points.map(p => ({
        id: p.id, type: 'FEEDER_POINT', status: p.status, areaName: p.areaName, locationName: p.feederPointName, zoneName: p.zoneName, wardName: p.wardName, createdAt: p.createdAt
      }));
      const mappedReports = reports.map(r => ({
        id: r.id, type: 'FEEDER_REPORT', status: r.status, areaName: r.feederPoint?.areaName, locationName: r.feederPoint?.locationDescription, zoneName: r.feederPoint?.zoneName, wardName: r.feederPoint?.wardName, createdAt: r.createdAt
      }));
      data = [...mappedPoints, ...mappedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
      totalRecords = pCount + rCount;
    }

    // 5. Stats
    const [statPendingP, statPendingR, statApprovedP, statApprovedR, statRejectedP, statRejectedR, statActionP, statActionR, totalP, totalR] = await Promise.all([
      prisma.taskforceFeederPoint.count({ where: { ...pointWhere, status: 'PENDING_QC' } }),
      prisma.taskforceFeederReport.count({ where: { ...reportWhere, status: 'SUBMITTED' } }),
      prisma.taskforceFeederPoint.count({ where: { ...pointWhere, status: 'APPROVED' } }),
      prisma.taskforceFeederReport.count({ where: { ...reportWhere, status: 'APPROVED' } }),
      prisma.taskforceFeederPoint.count({ where: { ...pointWhere, status: 'REJECTED' } }),
      prisma.taskforceFeederReport.count({ where: { ...reportWhere, status: 'REJECTED' } }),
      prisma.taskforceFeederPoint.count({ where: { ...pointWhere, status: 'ACTION_REQUIRED' } }),
      prisma.taskforceFeederReport.count({ where: { ...reportWhere, status: 'ACTION_REQUIRED' } }),
      prisma.taskforceFeederPoint.count({ where: pointWhere }),
      prisma.taskforceFeederReport.count({ where: reportWhere })
    ]);

    res.json({
      data,
      meta: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      },
      stats: {
        pending: statPendingP + statPendingR,
        approved: statApprovedP + statApprovedR,
        rejected: statRejectedP + statRejectedR,
        actionRequired: statActionP + statActionR,
        total: totalP + totalR
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
