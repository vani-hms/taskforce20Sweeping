import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireCityContext, requireCityAccess, requireRoles } from "../middleware/rbac";
import { validateBody } from "../utils/validation";
import { Prisma, Role, $Enums } from "../../generated/prisma";
import { HttpError } from "../utils/errors";
import { hashPassword } from "../auth/password";
import { getModuleLabel, normalizeModuleKey } from "../modules/moduleMetadata";
import { resolveCanWrite } from "../utils/moduleAccess";
import { syncCityModules } from "../utils/cityModuleSync";

const router = Router();
router.use(authenticate, requireCityContext());

type GeoLevel = "ZONE" | "WARD" | "AREA" | "BEAT";
const geoLevels: GeoLevel[] = ["ZONE", "WARD", "AREA", "BEAT"];

router.get(
  "/modules",
  requireRoles([Role.CITY_ADMIN, Role.COMMISSIONER, Role.ACTION_OFFICER, Role.EMPLOYEE, Role.QC]),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      await syncCityModules(cityId);
      const cityModules = await prisma.cityModule.findMany({
        where: { cityId },
        include: { module: true },
        orderBy: { module: { name: "asc" } }
      });
      const modules = cityModules.map((m) => ({
        id: m.moduleId,
        key: normalizeModuleKey(m.module.name),
        name: getModuleLabel(m.module.name),
        enabled: m.enabled
      }));
      res.json(modules);
    } catch (err) {
      next(err);
    }
  }
);

// Apply city-level access guard to remaining routes
router.use(requireCityAccess());

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

const geoUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  areaType: z.enum(["RESIDENTIAL", "COMMERCIAL", "SLUM"]).optional()
});

async function validateCityModules(cityId: string, modules: z.infer<typeof moduleAssignmentSchema>) {
  if (!modules.length) return modules;
  const ids = modules.map((m) => m.moduleId);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) throw new HttpError(400, "Duplicate modules are not allowed");
  const cityModules = await prisma.cityModule.findMany({
    where: { cityId, moduleId: { in: ids }, enabled: true },
    include: { module: true }
  });
  if (cityModules.length !== ids.length) {
    throw new HttpError(400, "One or more modules are not enabled for this city");
  }
  return cityModules;
}

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

const moduleAssignmentSchema = z
  .array(
    z.object({
      moduleId: z.string().uuid(),
      canWrite: z.boolean()
    })
  )
  .default([]);

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  // CITY_ADMIN creation via HMS only; limit here to non-admin staff
  role: z.nativeEnum(Role).refine((r) => ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"].includes(r as any), {
    message: "Invalid role"
  }),
  modules: moduleAssignmentSchema
});

router.post("/users", validateBody(userSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { email, name, password, role, modules } = req.body as z.infer<typeof userSchema>;
    const cityModules = await validateCityModules(cityId, modules);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const hashed = await hashPassword(password);
      user = await prisma.user.create({
        data: { email, name, password: hashed }
      });
    }

    const exists = await prisma.userCity.findFirst({
      where: { userId: user.id, cityId, role }
    });
    if (exists) {
      throw new HttpError(400, "User already assigned to this city with this role");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userCity.create({
        data: {
          userId: user.id,
          cityId,
          role
        }
      });

      if (cityModules.length) {
        await tx.userModuleRole.createMany({
          data: cityModules.map((cm) => ({
            userId: user.id,
            cityId,
            moduleId: cm.moduleId,
            role,
            canWrite: resolveCanWrite(role, modules.find((m) => m.moduleId === cm.moduleId)?.canWrite ?? false)
          }))
        });
      }
    });

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
      include: { user: { include: { modules: { where: { cityId }, include: { module: true } } } } },
      orderBy: { createdAt: "asc" }
    });
    res.json({
      users: users.map((uc) => ({
        id: uc.userId,
        name: uc.user.name,
        email: uc.user.email,
        role: uc.role,
        createdAt: uc.createdAt,
        modules: uc.user.modules.map((m) => ({
          id: m.moduleId,
          key: normalizeModuleKey(m.module.name),
          name: getModuleLabel(m.module.name),
          canWrite: m.canWrite
        }))
      }))
    });
  } catch (err) {
    next(err);
  }
});

router.get("/employees", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const roles = req.auth!.roles || [];
    const isCityAdmin = roles.includes(Role.CITY_ADMIN);
    const isQc = roles.includes(Role.QC);
    if (!isCityAdmin && !isQc) throw new HttpError(403, "Forbidden");

    const qcModuleIds = isQc
      ? new Set(
          (
            await prisma.userModuleRole.findMany({
              where: { userId: req.auth!.sub, cityId },
              select: { moduleId: true }
            })
          ).map((m) => m.moduleId)
        )
      : new Set<string>();

    const records = await prisma.userCity.findMany({
      where: { cityId, role: Role.EMPLOYEE },
      include: { user: { include: { modules: { where: { cityId }, include: { module: true } } } } },
      orderBy: { createdAt: "asc" }
    });

    const filtered = isCityAdmin
      ? records
      : records.filter((uc) => {
          if (uc.userId === req.auth!.sub) return false; // QC should not list self
          const mods = uc.user.modules.map((m) => m.moduleId);
          return mods.some((mid) => qcModuleIds.has(mid));
        });

    const zoneIds = filtered.flatMap((f) => (f as any).zoneIds || []);
    const wardIds = filtered.flatMap((f) => (f as any).wardIds || []);
    const geoNodes = await prisma.geoNode.findMany({
      where: { id: { in: Array.from(new Set([...zoneIds, ...wardIds])) } },
      select: { id: true, name: true, level: true }
    });
    const geoMap = Object.fromEntries(geoNodes.map((g) => [g.id, g.name]));

    res.json({
      employees: filtered.map((uc) => ({
        id: uc.userId,
        name: uc.user.name,
        email: uc.user.email,
        role: uc.role,
        modules: uc.user.modules.map((m) => ({
          id: m.moduleId,
          key: normalizeModuleKey(m.module.name),
          name: getModuleLabel(m.module.name),
          canWrite: m.canWrite
        })),
        zones: ((uc as any).zoneIds || []).map((z: string) => geoMap[z]).filter(Boolean),
        wards: ((uc as any).wardIds || []).map((w: string) => geoMap[w]).filter(Boolean),
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
      select: { id: true, name: true, code: true, ulbCode: true, enabled: true }
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
  modules: moduleAssignmentSchema.optional()
});

router.patch("/users/:userId", validateBody(userUpdateSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, role, modules } = req.body as z.infer<typeof userUpdateSchema>;
    const userId = req.params.userId;

    const uc = await prisma.userCity.findFirst({ where: { userId, cityId } });
    if (!uc) throw new HttpError(404, "User not found in this city");
    const newRole = role || uc.role;

    if (name) {
      await prisma.user.update({ where: { id: userId }, data: { name } });
    }
    if (role && role !== uc.role) {
      await prisma.userCity.update({ where: { id: uc.id }, data: { role } });
    }

    if (modules) {
      const cityModules = await validateCityModules(cityId, modules);
      const operations: any[] = [prisma.userModuleRole.deleteMany({ where: { userId, cityId } })];
      if (cityModules.length) {
        operations.push(
          prisma.userModuleRole.createMany({
            data: cityModules.map((cm) => ({
              userId,
              cityId,
              moduleId: cm.moduleId,
              role: newRole,
              canWrite: resolveCanWrite(
                newRole,
                modules.find((m) => m.moduleId === cm.moduleId)?.canWrite ?? false
              )
            }))
          })
        );
      }
      await prisma.$transaction(operations);
    } else if (role && role !== uc.role) {
      const assignments = await prisma.userModuleRole.findMany({ where: { userId, cityId } });
      if (assignments.length) {
        await prisma.$transaction(
          assignments.map((m) =>
            prisma.userModuleRole.update({
              where: { id: m.id },
              data: { role: newRole, canWrite: resolveCanWrite(newRole, m.canWrite) }
            })
          )
        );
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

router.get("/registration-requests", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const roles = req.auth!.roles || [];
    if (!roles.includes(Role.CITY_ADMIN)) throw new HttpError(403, "Forbidden");

    const requests = await prisma.userRegistrationRequest.findMany({
      where: { cityId },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      requests: requests.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        aadhaar: r.aadhaar,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

const approvalSchema = z.object({
  role: z.enum(["EMPLOYEE", "QC", "ACTION_OFFICER"]),
  moduleKeys: z.array(z.string().min(1)).min(1),
  zoneIds: z.array(z.string().uuid()).optional(),
  wardIds: z.array(z.string().uuid()).optional()
});

router.post("/registration-requests/:id/approve", validateBody(approvalSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub;
    const roles = req.auth!.roles || [];
    if (!roles.includes(Role.CITY_ADMIN)) throw new HttpError(403, "Forbidden");

    const { role, moduleKeys, zoneIds, wardIds } = req.body as z.infer<typeof approvalSchema>;

    const request = await prisma.userRegistrationRequest.findUnique({ where: { id: req.params.id } });
    if (!request || request.cityId !== cityId) throw new HttpError(404, "Request not found");
    if (request.status !== "PENDING") throw new HttpError(400, "Request already processed");

    // Validate zones/wards belong to city
    const zoneList = zoneIds?.length
      ? await prisma.geoNode.findMany({ where: { id: { in: zoneIds }, cityId, level: "ZONE" as any } })
      : [];
    if (zoneIds && zoneList.length !== zoneIds.length) throw new HttpError(400, "Invalid zones for this city");
    const wardList = wardIds?.length
      ? await prisma.geoNode.findMany({ where: { id: { in: wardIds }, cityId, level: "WARD" as any } })
      : [];
    if (wardIds && wardList.length !== wardIds.length) throw new HttpError(400, "Invalid wards for this city");

    // Resolve modules by key and ensure enabled for city
    const moduleNames = moduleKeys.map((k: string) => normalizeModuleKey(k));
    const modules = await prisma.module.findMany({ where: { name: { in: moduleNames } } });
    if (modules.length !== moduleNames.length) throw new HttpError(400, "One or more modules not found");
    const cityModules = await prisma.cityModule.findMany({
      where: { cityId, moduleId: { in: modules.map((m) => m.id) }, enabled: true }
    });
    if (cityModules.length !== modules.length) throw new HttpError(400, "Modules not enabled for this city");

    const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
    if (existingUser) throw new HttpError(400, "User already exists");

    const createdUser = await prisma.user.create({
      data: {
        email: request.email,
        name: request.name,
        password: request.passwordHash
      }
    });

    await prisma.userCity.create({
      data: {
        userId: createdUser.id,
        cityId,
        role: role as any,
        zoneIds: zoneIds || [],
        wardIds: wardIds || []
      } as any
    });

    await prisma.userModuleRole.createMany({
      data: modules.map((m) => ({
        userId: createdUser.id,
        cityId,
        moduleId: m.id,
        role: role as any,
        canWrite: false
      }))
    });

    await prisma.userRegistrationRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        approvedByUserId: userId,
        approvedByRole: Role.CITY_ADMIN,
        approvedAt: new Date()
      }
    });

    res.json({ success: true, userId: createdUser.id });
  } catch (err) {
    next(err);
  }
});

router.post("/registration-requests/:id/reject", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub;
    const roles = req.auth!.roles || [];
    const reason = typeof req.body?.reason === "string" ? req.body.reason : null;
    if (!roles.includes(Role.CITY_ADMIN)) throw new HttpError(403, "Forbidden");

    const request = await prisma.userRegistrationRequest.findUnique({ where: { id: req.params.id } });
    if (!request || request.cityId !== cityId) throw new HttpError(404, "Request not found");
    if (request.status !== "PENDING") throw new HttpError(400, "Request already processed");

    await prisma.userRegistrationRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedByUserId: userId,
        rejectedByRole: Role.CITY_ADMIN,
        rejectedAt: new Date(),
        rejectReason: reason
      }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
