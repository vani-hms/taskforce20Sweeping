import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { authenticate } from "../middleware/auth";
import { requireCityContext, requireCityAccess, requireRoles } from "../middleware/rbac";
import { validateBody } from "../utils/validation";
import { Prisma, Role, $Enums } from "../../generated/prisma";
import { HttpError } from "../utils/errors";
import { hashPassword } from "../auth/password";
import { CANONICAL_MODULE_KEYS, getModuleLabel, isCanonicalModuleKey, normalizeModuleKey } from "../modules/moduleMetadata";
import { resolveCanWrite } from "../utils/moduleAccess";
import { syncCityModules } from "../utils/cityModuleSync";
import { getQcScope } from "../utils/qcScope";

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
        where: { cityId, module: { name: { in: CANONICAL_MODULE_KEYS as any } } },
        include: { module: true },
        orderBy: { module: { name: "asc" } }
      });
      const modules = cityModules.map((m) => {
        const key = normalizeModuleKey(m.module.name);
        return {
          id: m.moduleId,
          key,
          name: getModuleLabel(key),
          enabled: m.enabled
        };
      });
      res.json(modules);
    } catch (err) {
      next(err);
    }
  }
);

// Apply city-level access guard to remaining routes


router.get("/geo", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const level = req.query.level as GeoLevel | undefined;
    const where: any = { cityId };
    if (level) {
      if (!geoLevels.includes(level)) throw new HttpError(400, "Invalid level");
      where.level = level;
    }
    const allNodes = await prisma.geoNode.findMany({
      where,
      orderBy: { createdAt: "asc" }
    });
    // Filter out obvious junk/test data or misused field values
    const nodes = allNodes.filter(n => {
      const name = n.name.toUpperCase();
      if (name === 'CT' || name === 'PT') return false;
      if (name.includes('WARD-UUID')) return false;
      return true;
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

// Apply city-level access guard to remaining routes
router.use(requireCityAccess());

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
    const node = await prisma.geoNode.findUnique({ where: { id: req.params.id as string } });
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
    const node = await prisma.geoNode.findUnique({ where: { id: req.params.id as string } });
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
      canWrite: z.boolean(),
      zoneIds: z.array(z.string().uuid()).optional(),
      wardIds: z.array(z.string().uuid()).optional()
    })
  )
  .default([]);

async function validateZoneWardScope(cityId: string, zoneIds?: string[], wardIds?: string[]) {
  const uniqueZones = Array.from(new Set(zoneIds || []));
  const uniqueWards = Array.from(new Set(wardIds || []));

  if (uniqueZones.length) {
    const zones = await prisma.geoNode.findMany({ where: { id: { in: uniqueZones }, cityId, level: "ZONE" as any } });
    if (zones.length !== uniqueZones.length) throw new HttpError(400, "Invalid zones for this city");
  }

  if (uniqueWards.length) {
    const wards = await prisma.geoNode.findMany({ where: { id: { in: uniqueWards }, cityId, level: "WARD" as any } });
    if (wards.length !== uniqueWards.length) throw new HttpError(400, "Invalid wards for this city");
  }

  if (uniqueZones.length && uniqueWards.length) {
    const wardParents = await prisma.geoNode.findMany({
      where: { id: { in: uniqueWards } },
      select: { id: true, parentId: true }
    });
    const zoneSet = new Set(uniqueZones);
    const invalidWard = wardParents.find((w) => w.parentId && !zoneSet.has(w.parentId));
    if (invalidWard) throw new HttpError(400, "Ward not under selected zone");
  }

  return { zoneIds: uniqueZones, wardIds: uniqueWards };
}

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  // CITY_ADMIN creation via HMS only; limit here to non-admin staff
  role: z.nativeEnum(Role).refine((r) => ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"].includes(r as any), {
    message: "Invalid role"
  }),
  modules: moduleAssignmentSchema,
  zoneIds: z.array(z.string().uuid()).optional(),
  wardIds: z.array(z.string().uuid()).optional()
});

router.post("/users", validateBody(userSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { email, name, password, role, modules, zoneIds, wardIds } = req.body as z.infer<typeof userSchema>;
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

    const baseScope = await validateZoneWardScope(cityId, zoneIds, wardIds);
    if (role === Role.QC && (!baseScope.zoneIds.length || !baseScope.wardIds.length)) {
      throw new HttpError(400, "QC users must have zoneIds and wardIds assigned");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userCity.create({
        data: {
          userId: user.id,
          cityId,
          role,
          zoneIds: baseScope.zoneIds,
          wardIds: baseScope.wardIds
        }
      });

      if (cityModules.length) {
        const modulePayloads = await Promise.all(
          cityModules.map(async (cm) => {
            const input = modules.find((m) => m.moduleId === cm.moduleId);
            const moduleScope =
              role === Role.QC
                ? await validateZoneWardScope(cityId, input?.zoneIds, input?.wardIds)
                : { zoneIds: [], wardIds: [] };
            const effectiveScope =
              role === Role.QC && moduleScope.zoneIds.length && moduleScope.wardIds.length
                ? moduleScope
                : role === Role.QC
                  ? baseScope
                  : { zoneIds: [], wardIds: [] };
            if (role === Role.QC && (!effectiveScope.zoneIds.length || !effectiveScope.wardIds.length)) {
              throw new HttpError(400, "QC module assignment requires zoneIds and wardIds");
            }
            return {
              userId: user.id,
              cityId,
              moduleId: cm.moduleId,
              role,
              canWrite: resolveCanWrite(role, input?.canWrite ?? false),
              zoneIds: effectiveScope.zoneIds,
              wardIds: effectiveScope.wardIds
            };
          })
        );
        await tx.userModuleRole.createMany({
          data: modulePayloads
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
      include: {
        user: { include: { modules: { where: { cityId }, include: { module: true } } } }
      },
      orderBy: { createdAt: "asc" }
    });
    res.json({
      users: users.map((uc) => ({
        id: uc.userId,
        name: uc.user.name,
        email: uc.user.email,
        role: uc.role,
        createdAt: uc.createdAt,
        zoneIds: uc.zoneIds || [],
        wardIds: uc.wardIds || [],
        modules: uc.user.modules
          .filter((m) => isCanonicalModuleKey(m.module.name))
          .map((m) => ({
            id: m.moduleId,
            key: normalizeModuleKey(m.module.name),
            name: getModuleLabel(m.module.name),
            canWrite: m.canWrite,
            zoneIds: m.zoneIds || [],
            wardIds: m.wardIds || []
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

    const moduleKey = (req.query.moduleKey as string | undefined)?.trim();

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

    // If moduleKey is provided, resolve it to moduleId and ensure QC has access
    let moduleFilterId: string | null = null;
    if (moduleKey) {
      const normalized = normalizeModuleKey(moduleKey);
      const mod = await prisma.module.findUnique({ where: { name: normalized } });
      if (!mod) throw new HttpError(400, "Module not found");
      moduleFilterId = mod.id;
      if (isQc && !qcModuleIds.has(mod.id)) {
        throw new HttpError(403, "Forbidden");
      }
    }

    const records = await prisma.userCity.findMany({
      where: { cityId, role: Role.EMPLOYEE },
      include: {
        user: {
          include: {
            modules: {
              where: { cityId, ...(moduleFilterId ? { moduleId: moduleFilterId } : {}) },
              include: { module: true }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    let qcScopes: Map<string, { zoneIds: string[]; wardIds: string[] }> = new Map();
    if (isQc) {
      const entries = await Promise.all(
        Array.from(qcModuleIds).map(async (mid) => [mid, await getQcScope({ userId: req.auth!.sub!, cityId, moduleId: mid })] as const)
      );
      qcScopes = new Map(entries);
    }

    console.log("[employees][debug]", {
      qcId: req.auth!.sub,
      qcCityId: cityId,
      moduleKey,
      qcModuleIds: Array.from(qcModuleIds),
      qcScopes: Array.from(qcScopes.entries()),
      totalEmployeesInCity: records.length
    });

    const filtered = isCityAdmin
      ? records
      : records.filter((uc) => {
        if (uc.userId === req.auth!.sub) return false; // QC should not list self
        const employeeZones = uc.zoneIds || [];
        const employeeWards = uc.wardIds || [];

        return uc.user.modules.some((m) => {
          if (moduleFilterId && m.moduleId !== moduleFilterId) return false;
          if (!qcModuleIds.has(m.moduleId)) return false;
          const scope = qcScopes.get(m.moduleId);
          if (!scope || !scope.zoneIds.length || !scope.wardIds.length) return false;
          const zoneMatch = scope.zoneIds.some((z) => employeeZones.includes(z));
          const wardMatch = scope.wardIds.some((w) => employeeWards.includes(w));
          return zoneMatch && wardMatch;
        });
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
        modules: uc.user.modules
          .filter((m) => isCanonicalModuleKey(m.module.name))
          .map((m) => ({
            id: m.moduleId,
            key: normalizeModuleKey(m.module.name),
            name: getModuleLabel(m.module.name),
            canWrite: m.canWrite
          })),
        zones: (uc.zoneIds || []).map((z: string) => geoMap[z]).filter(Boolean),
        wards: (uc.wardIds || []).map((w: string) => geoMap[w]).filter(Boolean),
        createdAt: uc.createdAt
      }))
    });

    console.log("[employees][debug] filtered", { scopedEmployees: filtered.length });
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
  modules: moduleAssignmentSchema.optional(),
  zoneIds: z.array(z.string().uuid()).optional(),
  wardIds: z.array(z.string().uuid()).optional()
});

router.patch("/users/:userId", validateBody(userUpdateSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const { name, role, modules, zoneIds, wardIds } = req.body as z.infer<typeof userUpdateSchema>;
    const userId = req.params.userId as string;

    const uc = await prisma.userCity.findFirst({ where: { userId, cityId } });
    if (!uc) throw new HttpError(404, "User not found in this city");
    const newRole = role || uc.role;

    if (name) {
      await prisma.user.update({ where: { id: userId }, data: { name } });
    }
    const desiredBaseZoneIds = zoneIds ?? ((uc as any).zoneIds || []);
    const desiredBaseWardIds = wardIds ?? ((uc as any).wardIds || []);
    const baseScope = await validateZoneWardScope(cityId, desiredBaseZoneIds, desiredBaseWardIds);
    if (!modules && newRole === Role.QC && (!baseScope.zoneIds.length || !baseScope.wardIds.length)) {
      throw new HttpError(400, "QC users must have zoneIds and wardIds assigned");
    }

    if (role && role !== uc.role) {
      await prisma.userCity.update({ where: { id: uc.id }, data: { role } });
    }

    if (zoneIds || wardIds) {
      await prisma.userCity.update({
        where: { id: uc.id },
        data: { zoneIds: baseScope.zoneIds, wardIds: baseScope.wardIds }
      });
    }

    if (modules) {
      const cityModules = await validateCityModules(cityId, modules);
      const existingModules = await prisma.userModuleRole.findMany({ where: { userId, cityId } });
      const operations: any[] = [prisma.userModuleRole.deleteMany({ where: { userId, cityId } })];
      const modulePayloads = await Promise.all(
        cityModules.map(async (cm) => {
          const input = modules.find((m) => m.moduleId === cm.moduleId);
          const requestedScope =
            newRole === Role.QC
              ? await validateZoneWardScope(cityId, input?.zoneIds, input?.wardIds)
              : { zoneIds: [], wardIds: [] };
          const previous = existingModules.find((m) => m.moduleId === cm.moduleId);
          const effectiveScope =
            newRole === Role.QC
              ? requestedScope.zoneIds.length && requestedScope.wardIds.length
                ? requestedScope
                : baseScope.zoneIds.length && baseScope.wardIds.length
                  ? baseScope
                  : previous && previous.zoneIds?.length && previous.wardIds?.length
                    ? { zoneIds: previous.zoneIds, wardIds: previous.wardIds }
                    : { zoneIds: [], wardIds: [] }
              : { zoneIds: [], wardIds: [] };

          if (newRole === Role.QC && (!effectiveScope.zoneIds.length || !effectiveScope.wardIds.length)) {
            throw new HttpError(400, "QC module assignment requires zoneIds and wardIds");
          }

          return {
            userId,
            cityId,
            moduleId: cm.moduleId,
            role: newRole,
            canWrite: resolveCanWrite(
              newRole,
              modules.find((m) => m.moduleId === cm.moduleId)?.canWrite ?? false
            ),
            zoneIds: effectiveScope.zoneIds,
            wardIds: effectiveScope.wardIds
          };
        })
      );
      if (cityModules.length) {
        operations.push(prisma.userModuleRole.createMany({ data: modulePayloads }));
      }
      await prisma.$transaction(operations);
    } else if (role && role !== uc.role) {
      const assignments = await prisma.userModuleRole.findMany({ where: { userId, cityId } });
      if (assignments.length) {
        await prisma.$transaction(
          assignments.map((m) =>
            prisma.userModuleRole.update({
              where: { id: m.id },
              data: {
                role: newRole,
                canWrite: resolveCanWrite(newRole, m.canWrite),
                zoneIds:
                  newRole === Role.QC && baseScope.zoneIds.length && baseScope.wardIds.length ? baseScope.zoneIds : [],
                wardIds:
                  newRole === Role.QC && baseScope.zoneIds.length && baseScope.wardIds.length ? baseScope.wardIds : []
              }
            })
          )
        );
      }
    } else if ((zoneIds || wardIds) && (uc.role === Role.QC || newRole === Role.QC)) {
      // Update existing QC module scopes to keep them in sync with city-level scope when explicit module payload not provided
      const assignments = await prisma.userModuleRole.findMany({ where: { userId, cityId, role: Role.QC } });
      if (assignments.length && baseScope.zoneIds.length && baseScope.wardIds.length) {
        await prisma.$transaction(
          assignments.map((m) =>
            prisma.userModuleRole.update({
              where: { id: m.id },
              data: { zoneIds: baseScope.zoneIds, wardIds: baseScope.wardIds }
            })
          )
        );
      }
    }

    // Reload user with scopes to ensure persistence and return explicit arrays
    const refreshed = await prisma.userCity.findFirst({
      where: { userId, cityId },
      include: { user: { include: { modules: { where: { cityId }, include: { module: true } } } } }
    }) as any;
    if (!refreshed) throw new HttpError(404, "User not found after update");
    if (newRole === Role.QC || refreshed.role === Role.QC) {
      if (!(refreshed.zoneIds || []).length || !(refreshed.wardIds || []).length) {
        throw new HttpError(400, "QC users must retain zone/ward scope");
      }
    }

    res.json({
      success: true,
      user: {
        id: refreshed.userId,
        role: refreshed.role,
        zoneIds: refreshed.zoneIds || [],
        wardIds: refreshed.wardIds || [],
        modules: (refreshed.user.modules as any[])
          .filter((m: any) => isCanonicalModuleKey(m.module.name))
          .map((m: any) => ({
            id: m.moduleId,
            key: normalizeModuleKey(m.module.name),
            name: getModuleLabel(m.module.name),
            canWrite: m.canWrite,
            zoneIds: m.zoneIds || [],
            wardIds: m.wardIds || []
          }))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:userId", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.params.userId as string;

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
  moduleKeys: z.array(z.string().min(1)).min(1)
});

router.post("/registration-requests/:id/approve", validateBody(approvalSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub;
    const roles = req.auth!.roles || [];
    if (!roles.includes(Role.CITY_ADMIN)) throw new HttpError(403, "Forbidden");

    const { role, moduleKeys } = req.body as z.infer<typeof approvalSchema>;

    const request = await prisma.userRegistrationRequest.findUnique({ where: { id: req.params.id as string } });
    if (!request || request.cityId !== cityId) throw new HttpError(404, "Request not found");
    if (request.status !== "PENDING") throw new HttpError(400, "Request already processed");

    // Pull zone/ward from registration (must be present)
    if (!request.zoneId || !request.wardId) {
      throw new HttpError(400, "Registration request missing zone/ward");
    }

    const zoneId = request.zoneId!;
    const wardId = request.wardId!;

    const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
    if (!zone || zone.cityId !== cityId || zone.level !== "ZONE") throw new HttpError(400, "Invalid zone for this city");
    const ward = await prisma.geoNode.findUnique({ where: { id: wardId } });
    if (!ward || ward.cityId !== cityId || ward.level !== "WARD") throw new HttpError(400, "Invalid ward for this city");
    if (ward.parentId !== zoneId) throw new HttpError(400, "Ward not under selected zone");

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
        zoneIds: [zoneId],
        wardIds: [wardId]
      } as any
    });

    await prisma.userModuleRole.createMany({
      data: modules.map((m) => ({
        userId: createdUser.id,
        cityId,
        moduleId: m.id,
        role: role as any,
        canWrite: false,
        zoneIds: role === "QC" ? [zoneId] : [],
        wardIds: role === "QC" ? [wardId] : []
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
