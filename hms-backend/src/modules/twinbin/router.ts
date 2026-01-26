import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext } from "../../middleware/rbac";
import { Role } from "../../../generated/prisma";
import { HttpError } from "../../utils/errors";
import { validateBody } from "../../utils/validation";
import { assertModuleAccess } from "../../middleware/rbac";
import { getModuleIdByName } from "../moduleRegistry";
import { normalizeModuleKey } from "../moduleMetadata";

const router = Router();
const MODULE_KEY = "TWINBIN";

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
    await ensureGeoValid(cityId, payload.zoneId, payload.wardId);

    const bin = await prisma.twinbinLitterBin.create({
      data: {
        cityId,
        requestedById: userId,
        zoneId: payload.zoneId || null,
        wardId: payload.wardId || null,
        areaName: payload.areaName,
        areaType: payload.areaType as any,
        locationName: payload.locationName,
        roadType: payload.roadType,
        isFixedProperly: payload.isFixedProperly,
        hasLid: payload.hasLid,
        condition: payload.condition as any,
        latitude: payload.latitude,
        longitude: payload.longitude,
        status: "PENDING_QC"
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

    const bins = await prisma.twinbinLitterBin.findMany({
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

    const bins = await prisma.twinbinLitterBin.findMany({
      where: { cityId, status: "PENDING_QC" },          // strict city + status filter
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } } // requester details for display
      }
    });

    console.info("[twinbin] pending bins", { cityId, qcId, count: bins.length }); // temp trace

    res.json({
      bins: bins.map((b) => ({
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
    const bin = await prisma.twinbinLitterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== "PENDING_QC") throw new HttpError(400, "Bin not pending");

    if (assignedEmployeeIds.length) {
      const employees = await prisma.userCity.findMany({
        where: { cityId, userId: { in: assignedEmployeeIds }, role: Role.EMPLOYEE }
      });
      if (employees.length !== assignedEmployeeIds.length) throw new HttpError(400, "Invalid employee assignment");
    }

    const updated = await prisma.twinbinLitterBin.update({
      where: { id: bin.id },
      data: {
        status: "APPROVED",
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

    const bin = await prisma.twinbinLitterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== "PENDING_QC") throw new HttpError(400, "Bin not pending");

    const updated = await prisma.twinbinLitterBin.update({
      where: { id: bin.id },
      data: { status: "REJECTED", approvedByQcId: userId, assignedEmployeeIds: [] }
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

    const bins = await prisma.twinbinLitterBin.findMany({
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

    const bins = await prisma.twinbinLitterBin.findMany({
      where: { cityId, status: "APPROVED", assignedEmployeeIds: { has: userId } },
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

const visitSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  inspectionAnswers: z.object({
    q1: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q2: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q3: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q4: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q5: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q6: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q7: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q8: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q9: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) }),
    q10: z.object({ answer: z.enum(["YES", "NO"]), photoUrl: z.string().min(1) })
  })
});

router.post("/bins/:id/visit", validateBody(visitSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bin = await prisma.twinbinLitterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== "APPROVED") throw new HttpError(400, "Bin not approved");
    if (!bin.assignedEmployeeIds.includes(userId)) throw new HttpError(403, "Not assigned to this bin");

    const payload = req.body as z.infer<typeof visitSchema>;
    const distance = haversineMeters(payload.latitude, payload.longitude, bin.latitude, bin.longitude);
    if (distance > 100) throw new HttpError(400, "You must be within 100 meters of the bin to submit");

    const report = await prisma.twinbinVisitReport.create({
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
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const visits = await prisma.twinbinVisitReport.findMany({
      where: { cityId, status: "PENDING_QC" },
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

    const visit = await prisma.twinbinVisitReport.findUnique({ where: { id: req.params.id } });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    if (visit.status !== "PENDING_QC") throw new HttpError(400, "Visit not pending");

    const updated = await prisma.twinbinVisitReport.update({
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

    const visit = await prisma.twinbinVisitReport.findUnique({ where: { id: req.params.id } });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    if (visit.status !== "PENDING_QC") throw new HttpError(400, "Visit not pending");

    const updated = await prisma.twinbinVisitReport.update({
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

    const visit = await prisma.twinbinVisitReport.findUnique({ where: { id: req.params.id } });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");

    const updated = await prisma.twinbinVisitReport.update({
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

    const visits = await prisma.twinbinVisitReport.findMany({
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

    const visit = await prisma.twinbinVisitReport.findUnique({ where: { id: req.params.id } });
    if (!visit || visit.cityId !== cityId) throw new HttpError(404, "Visit not found");
    if (visit.actionStatus !== "ACTION_REQUIRED") throw new HttpError(400, "Visit not pending action");

    const updated = await prisma.twinbinVisitReport.update({
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
  questionnaire: z.any()
});

router.post("/bins/:id/report", validateBody(binReportSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const bin = await prisma.twinbinLitterBin.findUnique({ where: { id: req.params.id } });
    if (!bin || bin.cityId !== cityId) throw new HttpError(404, "Bin not found");
    if (bin.status !== "APPROVED") throw new HttpError(400, "Bin not approved");
    if (!bin.assignedEmployeeIds.includes(userId)) throw new HttpError(403, "Not assigned to this bin");

    if (!bin.latitude || !bin.longitude) throw new HttpError(400, "Bin location unavailable");

    const payload = req.body as z.infer<typeof binReportSchema>;
    const distance = haversineMeters(payload.latitude, payload.longitude, bin.latitude, bin.longitude);
    if (distance > 50) throw new HttpError(403, "You must be within 50 meters of the bin to submit");

    const report = await prisma.twinbinLitterBinReport.create({
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
    const moduleId = await getModuleIdByName(MODULE_KEY);
    forbidCityAdminOrCommissioner(req);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const reports = await prisma.twinbinLitterBinReport.findMany({
      where: { cityId, status: "SUBMITTED" },
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

    const report = await prisma.twinbinLitterBinReport.findUnique({ where: { id: req.params.id } });
    if (!report || report.cityId !== cityId) throw new HttpError(404, "Report not found");
    if (report.status !== "SUBMITTED") throw new HttpError(400, "Report not pending review");

    const updated = await prisma.twinbinLitterBinReport.update({
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
