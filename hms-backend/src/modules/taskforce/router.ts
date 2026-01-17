import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, requireModuleRoles } from "../../middleware/rbac";
import { validateBody } from "../../utils/validation";
import { Prisma, Role } from "../../../generated/prisma";

const TASKFORCE_MODULE_ID = "TASKFORCE_MODULE_ID_PLACEHOLDER"; // replace with real module id or lookup

const router = Router();
router.use(
  authenticate,
  requireCityContext(),
  requireModuleRoles(TASKFORCE_MODULE_ID, [
    Role.EMPLOYEE,
    Role.QC,
    Role.ACTION_OFFICER,
    Role.CITY_ADMIN,
    Role.HMS_SUPER_ADMIN
  ])
);

const createSchema = z.object({
  title: z.string().min(1),
  status: z.string().default("OPEN"),
  geoNodeId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional()
});

router.post("/cases", validateBody(createSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { title, status, geoNodeId, assignedTo } = req.body as z.infer<typeof createSchema>;
    const caseRecord = await prisma.taskforceCase.create({
      data: {
        cityId,
        moduleId: TASKFORCE_MODULE_ID,
        title,
        status,
        geoNodeId,
        assignedTo,
        createdBy: req.auth!.sub
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
    const { status, assignedTo } = req.body as z.infer<typeof statusSchema>;
    const updated = await prisma.taskforceCase.update({
      where: { id: req.params.id },
      data: { status, assignedTo },
      include: { activities: false }
    });
    if (updated.cityId !== cityId) return res.status(403).json({ error: "Cross-city access denied" });
    res.json({ case: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/cases", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const cases = await prisma.taskforceCase.findMany({
      where: { cityId, moduleId: TASKFORCE_MODULE_ID }
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
    const caseId = req.params.id;
    const { action, metadata } = req.body as z.infer<typeof activitySchema>;
    const activity = await prisma.taskforceActivity.create({
      data: {
        cityId,
        moduleId: TASKFORCE_MODULE_ID,
        caseId,
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
