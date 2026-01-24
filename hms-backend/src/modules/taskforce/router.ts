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

async function ensureModuleEnabled(cityId: string, moduleId: string) {
  const cm = await prisma.cityModule.findUnique({ where: { cityId_moduleId: { cityId, moduleId } } });
  if (!cm || !cm.enabled) throw new HttpError(400, "Module not enabled for this city");
}

const createSchema = z.object({
  title: z.string().min(1),
  status: z.string().default("OPEN"),
  geoNodeId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional()
});

router.post("/cases", validateBody(createSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName("TASKFORCE");
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
    const moduleId = await getModuleIdByName("TASKFORCE");
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
    const moduleId = await getModuleIdByName("TASKFORCE");
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
    const moduleId = await getModuleIdByName("TASKFORCE");
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
