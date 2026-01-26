import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
import { validateBody } from "../../utils/validation";
import { Role } from "../../../generated/prisma";
import { HttpError } from "../../utils/errors";
import { getModuleIdByName } from "../moduleRegistry";

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
  areaName: z.string().min(1),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]),
  feederPointName: z.string().min(1),
  locationDescription: z.string().min(1),
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
    await ensureGeoValid(cityId, payload.zoneId, payload.wardId);

    const feederPoint = await prisma.taskforceFeederPoint.create({
      data: {
        cityId,
        requestedById: userId,
        zoneId: payload.zoneId || null,
        wardId: payload.wardId || null,
        areaName: payload.areaName,
        areaType: payload.areaType as any,
        feederPointName: payload.feederPointName,
        locationDescription: payload.locationDescription,
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
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoints = await prisma.taskforceFeederPoint.findMany({
      where: { cityId, status: "PENDING_QC" },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, name: true, email: true } } }
    });

    res.json({ feederPoints });
  } catch (err) {
    next(err);
  }
});

const approveSchema = z.object({
  assignedEmployeeIds: z.array(z.string().uuid()).optional()
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
    if (feederPoint.status !== "PENDING_QC") throw new HttpError(400, "Feeder point not pending QC");

    const { assignedEmployeeIds = [] } = req.body as z.infer<typeof approveSchema>;
    if (assignedEmployeeIds.length) {
      const employees = await prisma.userCity.findMany({
        where: { cityId, userId: { in: assignedEmployeeIds }, role: Role.EMPLOYEE }
      });
      if (employees.length !== assignedEmployeeIds.length) throw new HttpError(400, "Invalid employee assignment");
    }

    const updated = await prisma.taskforceFeederPoint.update({
      where: { id: feederPoint.id },
      data: {
        status: "APPROVED",
        approvedByQcId: userId,
        assignedEmployeeIds
      }
    });

    res.json({ feederPoint: updated });
  } catch (err) {
    next(err);
  }
});

router.post("/feeder-points/:id/reject", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
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

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id } });
    if (!feederPoint || feederPoint.cityId !== cityId) throw new HttpError(404, "Feeder point not found");
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
      orderBy: { createdAt: "desc" }
    });

    res.json({ feederPoints });
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

    const feederPoint = await prisma.taskforceFeederPoint.findUnique({ where: { id: req.params.id } });
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
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);
    await ensureModuleEnabled(cityId, moduleId);

    const reports = await prisma.taskforceFeederReport.findMany({
      where: { cityId, status: "SUBMITTED" },
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

    const report = await prisma.taskforceFeederReport.findUnique({ where: { id: req.params.id } });
    if (!report || report.cityId !== cityId) throw new HttpError(404, "Report not found");
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

    const caseRecord = await prisma.taskforceCase.findUnique({ where: { id: req.params.id } });
    if (!caseRecord || caseRecord.cityId !== cityId) throw new HttpError(404, "Case not found");

    const { status, assignedTo } = req.body as z.infer<typeof statusSchema>;
    const updated = await prisma.taskforceCase.update({
      where: { id: req.params.id },
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

    const caseRecord = await prisma.taskforceCase.findUnique({ where: { id: req.params.id } });
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

export default router;
