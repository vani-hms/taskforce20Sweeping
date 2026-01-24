import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
import { Role, IECStatus } from "../../../generated/prisma";
import { validateBody } from "../../utils/validation";
import { HttpError } from "../../utils/errors";
import { getModuleIdByName } from "../moduleRegistry";

const router = Router();
router.use(authenticate, requireCityContext());

async function ensureModuleEnabled(cityId: string, moduleId: string) {
  const cm = await prisma.cityModule.findUnique({ where: { cityId_moduleId: { cityId, moduleId } } });
  if (!cm || !cm.enabled) throw new HttpError(400, "Module not enabled for this city");
}

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional()
});

router.post("/forms", validateBody(formSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName("TOILET");
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);
    await ensureModuleEnabled(cityId, moduleId);

    const { title, description } = req.body as z.infer<typeof formSchema>;
    const form = await prisma.iECForm.create({
      data: {
        cityId,
        moduleId,
        title,
        description,
        status: IECStatus.SUBMITTED,
        submittedBy: req.auth!.sub
      }
    });
    res.json({ form });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(IECStatus).optional()
});

router.patch("/forms/:id", validateBody(updateSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName("TOILET");
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE, Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);
    await ensureModuleEnabled(cityId, moduleId);

    const existing = await prisma.iECForm.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.cityId !== cityId) throw new HttpError(404, "Form not found");

    const form = await prisma.iECForm.update({
      where: { id: req.params.id },
      data: { ...req.body }
    });
    res.json({ form });
  } catch (err) {
    next(err);
  }
});

router.get("/forms", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName("TOILET");
    await assertModuleAccess(req, res, moduleId, [
      Role.EMPLOYEE,
      Role.QC,
      Role.ACTION_OFFICER,
      Role.CITY_ADMIN,
      Role.COMMISSIONER
    ]);
    await ensureModuleEnabled(cityId, moduleId);

    const forms = await prisma.iECForm.findMany({
      where: { cityId, moduleId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ forms });
  } catch (err) {
    next(err);
  }
});

router.get("/reports/summary", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName("TOILET");
    await assertModuleAccess(req, res, moduleId, [
      Role.EMPLOYEE,
      Role.QC,
      Role.ACTION_OFFICER,
      Role.CITY_ADMIN,
      Role.COMMISSIONER
    ]);
    await ensureModuleEnabled(cityId, moduleId);

    const totals = await prisma.iECForm.groupBy({
      by: ["status"],
      where: { cityId, moduleId },
      _count: { status: true }
    });
    res.json({
      summary: totals.map((t) => ({ status: t.status, count: t._count.status }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
