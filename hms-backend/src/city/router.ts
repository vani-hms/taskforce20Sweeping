import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireCityContext, requireCityAccess } from "../middleware/rbac";
import { validateBody } from "../utils/validation";
import { Prisma, Role, $Enums } from "../../generated/prisma";
import { HttpError } from "../utils/errors";
import { hashPassword } from "../auth/password";

const router = Router();
router.use(authenticate, requireCityContext(), requireCityAccess());

type GeoLevel = "ZONE" | "WARD" | "AREA" | "BEAT";
const geoLevels: GeoLevel[] = ["ZONE", "WARD", "AREA", "BEAT"];

const geoSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
  level: z.enum(["ZONE", "WARD", "AREA", "BEAT"]),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]).optional()
});

async function validateParent(cityId: string, parentId: string | undefined, level: GeoLevel) {
  if (level === "ZONE") {
    if (parentId) throw new HttpError(400, "Zone cannot have a parent");
    return null;
  }
  if (!parentId) throw new HttpError(400, "Parent required");
  const parent = await prisma.geoNode.findUnique({ where: { id: parentId } });
  if (!parent || parent.cityId !== cityId) throw new HttpError(400, "Invalid parent for this city");
  const allowedParent: Record<string, GeoLevel> = {
    ZONE: "ZONE",
    WARD: "ZONE",
    AREA: "WARD",
    BEAT: "AREA"
  };
  const expected = allowedParent[level];
  if (parent.level !== expected) {
    throw new HttpError(400, `Parent of ${level} must be ${expected}`);
  }
  return parent;
}

router.post("/geo", validateBody(geoSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, parentId, level, areaType } = req.body as z.infer<typeof geoSchema>;
    const parent = await validateParent(cityId, parentId, level);
    if (level === "AREA" && !areaType) {
      throw new HttpError(400, "areaType is required for AREA level");
    }
    if (level !== "AREA" && areaType) {
      throw new HttpError(400, "areaType is only allowed for AREA level");
    }
    if (level === "AREA") {
      const exists = await prisma.geoNode.findFirst({
        where: { cityId, parentId: parentId || undefined, level: "AREA", name }
      });
      if (exists) throw new HttpError(400, "Area name must be unique within the ward");
    }

    const created = await prisma.geoNode.create({
      data: {
        cityId,
        level: level as $Enums.GeoLevel,
        name,
        areaType: level === "AREA" ? (areaType as $Enums.AreaType) : null,
        parentId: parentId || null,
        path: ""
      }
    });

    const basePath = parent ? parent.path : `/city/${cityId}`;
    const path = `${basePath}/${level.toLowerCase()}/${created.id}`;
    const updated = await prisma.geoNode.update({
      where: { id: created.id },
      data: { path }
    });

    res.json({ node: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/geo", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const level = req.query.level as GeoLevel | undefined;
    const where: any = { cityId };
    if (level) {
      if (!geoLevels.includes(level)) throw new HttpError(400, "Invalid level");
      where.level = level;
    }
    const nodes = await prisma.geoNode.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
    res.json({ nodes });
  } catch (err) {
    next(err);
  }
});

const geoUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]).optional()
});

router.patch("/geo/:id", validateBody(geoUpdateSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, areaType } = req.body as z.infer<typeof geoUpdateSchema>;
    const node = await prisma.geoNode.findUnique({ where: { id: req.params.id } });
    if (!node || node.cityId !== cityId) throw new HttpError(404, "Geo node not found");
    if (areaType && node.level !== "AREA") throw new HttpError(400, "areaType can only be set for AREA level");
    if (node.level === "AREA" && name) {
      const exists = await prisma.geoNode.findFirst({
        where: { cityId, parentId: node.parentId || undefined, level: "AREA", name, NOT: { id: node.id } }
      });
      if (exists) throw new HttpError(400, "Area name must be unique within the ward");
    }
    const updated = await prisma.geoNode.update({
      where: { id: node.id },
      data: {
        ...(name ? { name } : {}),
        ...(areaType ? { areaType: areaType as $Enums.AreaType } : {})
      }
    });
    res.json({ node: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/geo/:id", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const node = await prisma.geoNode.findUnique({ where: { id: req.params.id } });
    if (!node || node.cityId !== cityId) throw new HttpError(404, "Geo node not found");
    const childCount = await prisma.geoNode.count({ where: { parentId: node.id } });
    if (childCount > 0) throw new HttpError(400, "Cannot delete node with existing children");
    await prisma.geoNode.delete({ where: { id: node.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  // CITY_ADMIN creation via HMS only; limit here to non-admin staff
  role: z.nativeEnum(Role).refine((r) => ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"].includes(r), {
    message: "Invalid role"
  }),
  moduleId: z.string().uuid().optional(),
  canWrite: z.boolean().optional().default(false)
});

router.post("/users", validateBody(userSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { email, name, password, role, moduleId, canWrite } = req.body as z.infer<typeof userSchema>;

    // Ensure module belongs to city if provided
    if (moduleId) {
      const cityModule = await prisma.cityModule.findUnique({
        where: { cityId_moduleId: { cityId, moduleId } }
      });
      if (!cityModule || !cityModule.enabled) {
        throw new HttpError(400, "Module not enabled for this city");
      }
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const hashed = await hashPassword(password);
      user = await prisma.user.create({
        data: { email, name, password: hashed }
      });
    } else {
      // if user exists and already assigned with this role in this city, block
      const exists = await prisma.userCity.findFirst({
        where: { userId: user.id, cityId, role }
      });
      if (exists) {
        throw new HttpError(400, "User already assigned to this city with this role");
      }
    }

    await prisma.userCity.create({
      data: {
        userId: user.id,
        cityId,
        role
      }
    });

    if (moduleId) {
      await prisma.userModuleRole.create({
        data: {
          userId: user.id,
          cityId,
          moduleId,
          role,
          canWrite: !!canWrite
        }
      });
    }

    res.json({ user: { id: user.id, email: user.email, name: user.name, role } });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const users = await prisma.userCity.findMany({
      where: { cityId },
      include: { user: true },
      orderBy: { createdAt: "asc" }
    });
    res.json({
      users: users.map((uc) => ({
        id: uc.userId,
        name: uc.user.name,
        email: uc.user.email,
        role: uc.role,
        createdAt: uc.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.get("/info", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true, code: true, enabled: true }
    });
    if (!city) throw new HttpError(404, "City not found");
    res.json({ city });
  } catch (err) {
    next(err);
  }
});

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z
    .nativeEnum(Role)
    .optional()
    .refine((r) => !r || ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"].includes(r), {
      message: "Invalid role"
    }),
  moduleId: z.string().uuid().optional(),
  canWrite: z.boolean().optional()
});

router.patch("/users/:userId", validateBody(userUpdateSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, role, moduleId, canWrite } = req.body as z.infer<typeof userUpdateSchema>;
    const userId = req.params.userId;

    const uc = await prisma.userCity.findFirst({ where: { userId, cityId } });
    if (!uc) throw new HttpError(404, "User not found in this city");

    if (name) {
      await prisma.user.update({ where: { id: userId }, data: { name } });
    }
    if (role && role !== uc.role) {
      await prisma.userCity.update({ where: { id: uc.id }, data: { role } });
    }
    if (moduleId) {
      const cityModule = await prisma.cityModule.findUnique({
        where: { cityId_moduleId: { cityId, moduleId } }
      });
      if (!cityModule || !cityModule.enabled) {
        throw new HttpError(400, "Module not enabled for this city");
      }
      const existing = await prisma.userModuleRole.findFirst({
        where: { userId, cityId, moduleId }
      });
      if (existing) {
        await prisma.userModuleRole.update({
          where: { id: existing.id },
          data: { role: role || existing.role, canWrite: canWrite ?? existing.canWrite }
        });
      } else {
        await prisma.userModuleRole.create({
          data: {
            userId,
            cityId,
            moduleId,
            role: role || Role.EMPLOYEE,
            canWrite: !!canWrite
          }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:userId", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.params.userId;

    const uc = await prisma.userCity.findFirst({ where: { userId, cityId } });
    if (!uc) throw new HttpError(404, "User not found in this city");

    await prisma.userModuleRole.deleteMany({ where: { userId, cityId } });
    await prisma.userCity.deleteMany({ where: { userId, cityId } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
