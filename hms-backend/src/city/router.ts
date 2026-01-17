import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireCityContext, requireRoles } from "../middleware/rbac";
import { validateBody } from "../utils/validation";
import { Prisma, Role } from "../../generated/prisma";

const router = Router();
router.use(authenticate, requireRoles([Role.CITY_ADMIN, Role.HMS_SUPER_ADMIN]), requireCityContext());

const zoneSchema = z.object({ name: z.string().min(1) });
router.post("/zones", validateBody(zoneSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const zone = await prisma.geoNode.create({
      data: {
        cityId,
        level: "ZONE",
        name: req.body.name,
        path: "" // TODO: generate materialized path
      }
    });
    res.json({ zone });
  } catch (err) {
    next(err);
  }
});

const wardSchema = z.object({ name: z.string().min(1), zoneId: z.string().uuid() });
router.post("/wards", validateBody(wardSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, zoneId } = req.body as z.infer<typeof wardSchema>;
    const ward = await prisma.geoNode.create({
      data: { cityId, level: "WARD", name, parentId: zoneId, path: "" }
    });
    res.json({ ward });
  } catch (err) {
    next(err);
  }
});

const optionalSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid(),
  level: z.enum(["KOTHI", "SUB_KOTHI", "GALI"])
});
router.post("/geo", validateBody(optionalSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, parentId, level } = req.body as z.infer<typeof optionalSchema>;
    const node = await prisma.geoNode.create({
      data: { cityId, level, name, parentId, path: "" }
    });
    res.json({ node });
  } catch (err) {
    next(err);
  }
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  moduleId: z.string().uuid().optional(),
  role: z.nativeEnum(Role)
});

router.post("/users", validateBody(userSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { email, name, moduleId, role } = req.body as z.infer<typeof userSchema>;
    const user = await prisma.user.create({ data: { email, password: "TEMP_PASSWORD", name } });
    await prisma.userCity.create({ data: { userId: user.id, cityId, role } });
    if (moduleId) {
      await prisma.userModuleRole.create({ data: { userId: user.id, cityId, moduleId, role } });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
