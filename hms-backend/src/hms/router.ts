import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { validateBody } from "../utils/validation";
import { Prisma, Role } from "../../generated/prisma";
import { HttpError } from "../utils/errors";

const router = Router();
router.use(authenticate, requireRoles([Role.HMS_SUPER_ADMIN]));

const citySchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1)
});

router.post("/cities", validateBody(citySchema), async (req, res, next) => {
  try {
    const { name, code } = req.body as z.infer<typeof citySchema>;
    const hms = await prisma.hMS.findFirst({ where: { name: "HMS" } });
    if (!hms) throw new HttpError(400, "HMS org missing");
    const city = await prisma.city.create({
      data: {
        name,
        code,
        hmsId: hms.id
      }
    });
    res.json({ city });
  } catch (err) {
    next(err);
  }
});

const moduleToggleSchema = z.object({
  moduleId: z.string().uuid(),
  enabled: z.boolean()
});

router.patch("/cities/:cityId/modules/:moduleId", async (req, res, next) => {
  try {
    const cityId = req.params.cityId;
    const moduleId = req.params.moduleId;
    const enabled = req.body?.enabled ?? true;
    const cityModule = await prisma.cityModule.upsert({
      where: { cityId_moduleId: { cityId, moduleId } },
      create: { cityId, moduleId, enabled },
      update: { enabled }
    });
    res.json({ cityModule });
  } catch (err) {
    next(err);
  }
});

const adminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  cityId: z.string().uuid()
});

router.post("/cities/:cityId/admins", validateBody(adminSchema), async (req, res, next) => {
  try {
    const { email, password, name, cityId } = req.body as z.infer<typeof adminSchema>;
    if (cityId !== req.params.cityId) throw new HttpError(400, "cityId mismatch");
    const user = await prisma.user.create({
      data: { email, password, name }
    });
    await prisma.userCity.create({
      data: {
        userId: user.id,
        cityId,
        role: Role.CITY_ADMIN
      }
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
