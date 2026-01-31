import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken } from "./jwt";
import { validateBody } from "../utils/validation";
import { HttpError } from "../utils/errors";
import { Prisma, Role } from "../../generated/prisma";
import { GeoLevel } from "../../generated/prisma";
import { CANONICAL_MODULE_KEYS, getModuleLabel, isCanonicalModuleKey, normalizeModuleKey } from "../modules/moduleMetadata";
import { getRoleLabel } from "../utils/labels";
import { resolveCanWrite } from "../utils/moduleAccess";
import { authenticate } from "../middleware/auth";
import { requireCityContext } from "../middleware/rbac";

const router = Router();

router.get("/me", authenticate, requireCityContext(), async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const cityId = req.auth!.cityId!; // enforced by requireCityContext

    const userCity = await prisma.userCity.findFirst({
      where: { userId, cityId },
      include: {
        user: {
          include: {
            modules: {
              where: { cityId },
              include: { module: true }
            }
          }
        }
      }
    });

    if (!userCity) {
      throw new HttpError(404, "User not found in current city context");
    }

    res.json({
      user: {
        id: userCity.userId,
        name: userCity.user.name,
        email: userCity.user.email,
        role: userCity.role,
        zoneIds: userCity.zoneIds || [],
        wardIds: userCity.wardIds || [],
        modules: userCity.user.modules
          .filter((m) => isCanonicalModuleKey(m.module.name))
          .map((m) => ({
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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  cityId: z.string().uuid().optional()
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, cityId } = req.body as z.infer<typeof loginSchema>;
    const pendingReq = await prisma.userRegistrationRequest.findFirst({
      where: { email, status: { not: "APPROVED" } }
    });
    if (pendingReq) {
      throw new HttpError(403, "Your registration is pending approval");
    }
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        cities: true,
        modules: { include: { module: true } }
      }
    });
    if (!user) throw new HttpError(401, "Invalid credentials");
    const ok = await verifyPassword(password, user.password);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    type UserWithRelations = Prisma.UserGetPayload<{ include: { cities: true; modules: { include: { module: true } } } }>;
    const typedUser: UserWithRelations = user as UserWithRelations;

    // Determine active city and roles
    const allowedCities = typedUser.cities.map((c) => c.cityId);
    const activeCityId = cityId && allowedCities.includes(cityId) ? cityId : allowedCities[0];
    const cityRoles = activeCityId
      ? typedUser.cities.filter((c) => c.cityId === activeCityId).map((c) => c.role)
      : [];

    // HMS bootstrap: if the user has no city assignments, treat them as HMS super admin
    const effectiveRoles = cityRoles.length ? cityRoles : [Role.HMS_SUPER_ADMIN];

    // Validate city presence for non-HMS users
    const isHms = effectiveRoles.includes(Role.HMS_SUPER_ADMIN);
    if (!isHms && !activeCityId) {
      throw new HttpError(403, "No city assignment for this user");
    }

    // Build module claims (active city only)
    let moduleClaims = typedUser.modules
      .filter((m) => !activeCityId || m.cityId === activeCityId)
      .filter((m) => isCanonicalModuleKey(m.module.name))
      .map((m) => ({
        moduleId: m.moduleId,
        key: normalizeModuleKey(m.module.name),
        name: getModuleLabel(m.module.name),
        role: m.role,
        roles: [m.role],
        canWrite: resolveCanWrite(m.role, m.canWrite)
      }));

    // City admins inherit access to all enabled city modules
    if (activeCityId && effectiveRoles.includes(Role.CITY_ADMIN)) {
      const cityModules = await prisma.cityModule.findMany({
        where: { cityId: activeCityId, enabled: true, module: { name: { in: CANONICAL_MODULE_KEYS as any } } },
        include: { module: true },
        orderBy: { createdAt: "asc" }
      });
      const existing = new Map(moduleClaims.map((m) => [m.moduleId, m]));
      cityModules.forEach((cm) => {
        if (existing.has(cm.moduleId)) {
          const current = existing.get(cm.moduleId)!;
          const mergedRoles = Array.from(new Set([...current.roles, Role.CITY_ADMIN]));
          const updated = { ...current, roles: mergedRoles, canWrite: true };
          existing.set(cm.moduleId, updated);
        } else {
          const key = normalizeModuleKey(cm.module.name);
          existing.set(cm.moduleId, {
            moduleId: cm.moduleId,
            key,
            name: getModuleLabel(cm.module.name),
            role: Role.CITY_ADMIN,
            roles: [Role.CITY_ADMIN],
            canWrite: true
          });
        }
      });
      moduleClaims = Array.from(existing.values());
    }

    // Redirect decision
    let redirectTo = "/login";
    if (isHms) {
      redirectTo = "/hms";
    } else if (effectiveRoles.includes(Role.CITY_ADMIN) || effectiveRoles.includes(Role.COMMISSIONER)) {
      redirectTo = "/city";
    } else {
      if (moduleClaims.length === 0) {
        throw new HttpError(403, "No module assigned for this user");
      }
      const first = moduleClaims[0];
      redirectTo = `/modules/${first.key.toLowerCase()}`;
    }

    const claims = {
      sub: user.id,
      cityId: activeCityId,
      roles: effectiveRoles,
      modules: moduleClaims.map((m) => ({
        moduleId: m.moduleId,
        key: m.key,
        name: m.name,
        role: m.role,
        roles: m.roles,
        canWrite: m.canWrite
      }))
    };
    const token = signAccessToken(claims);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleLabels: effectiveRoles.map((r) => getRoleLabel(r)),
        cityId: activeCityId,
        roles: effectiveRoles,
        modules: moduleClaims.map((m) => ({
          moduleId: m.moduleId,
          key: m.key,
          name: m.name,
          label: getModuleLabel(m.key),
          canWrite: m.canWrite
        }))
      },
      redirectTo
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  // Stateless logout; frontend clears token cookie
  res.json({ success: true });
});

// Example signup for seeding/testing HMS super admin
const seedSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

router.post("/seed-hms-admin", validateBody(seedSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body as z.infer<typeof seedSchema>;
    const hashed = await hashPassword(password);
    const hms = await prisma.hMS.upsert({
      where: { name: "HMS" },
      create: { name: "HMS" },
      update: {}
    });
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name
      }
    });
    // no city context yet; HMS admin can create cities then assign
    const token = signAccessToken({ sub: user.id, roles: [Role.HMS_SUPER_ADMIN], modules: [] });
    res.json({ token, user, hms });
  } catch (err) {
    next(err);
  }
});

const registrationSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  aadhaar: z.string().min(6),
  email: z.string().email(),
  password: z.string().min(6),
  cityId: z.string().uuid(),
  zoneId: z.string().uuid(),
  wardId: z.string().uuid(),
  requestedModules: z.array(z.string()).min(1)
});

router.post("/request-registration", validateBody(registrationSchema), async (req, res, next) => {
  try {
    const { name, phone, aadhaar, email, password, cityId, zoneId, wardId, requestedModules } =
      req.body as z.infer<typeof registrationSchema>;

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new HttpError(404, "City not found");

    const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
    if (!zone || zone.cityId !== cityId || zone.level !== (GeoLevel as any).ZONE) {
      throw new HttpError(400, "Invalid zone for city");
    }
    const ward = await prisma.geoNode.findUnique({ where: { id: wardId } });
    if (!ward || ward.cityId !== cityId || ward.level !== (GeoLevel as any).WARD) {
      throw new HttpError(400, "Invalid ward for city");
    }
    if (ward.parentId !== zoneId) throw new HttpError(400, "Ward not under selected zone");

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new HttpError(400, "User already exists");

    const hashed = await hashPassword(password);
    const normalizedModules = Array.from(new Set(requestedModules.map((m) => normalizeModuleKey(m))));

    const request = await prisma.userRegistrationRequest.create({
      data: {
        name,
        phone,
        aadhaar,
        email,
        passwordHash: hashed,
        cityId,
        zoneId,
        wardId,
        requestedModules: normalizedModules,
        status: "PENDING"
      }
    });
    res.json({ requestId: request.id, status: request.status });
  } catch (err) {
    next(err);
  }
});

const publicRegistrationSchema = z.object({
  ulbCode: z.string().min(1).optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  aadharNumber: z.string().min(6),
  password: z.string().min(6),
  zoneId: z.string().uuid(),
  wardId: z.string().uuid(),
  cityId: z.string().uuid().optional()
});

router.post("/register-request", validateBody(publicRegistrationSchema), async (req, res, next) => {
  try {
    const { ulbCode, name, email, phone, aadharNumber, password, zoneId, wardId, cityId } = req.body as z.infer<
      typeof publicRegistrationSchema
    >;

    let city;
    if (cityId) {
      city = await prisma.city.findUnique({ where: { id: cityId } });
    } else if (ulbCode) {
      city = await prisma.city.findFirst({ where: { ulbCode } });
    }

    if (!city) throw new HttpError(400, "Invalid City or ULB Code");

    const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
    if (!zone || zone.cityId !== city.id || zone.level !== (GeoLevel as any).ZONE) {
      throw new HttpError(400, "Invalid zone for city");
    }
    const ward = await prisma.geoNode.findUnique({ where: { id: wardId } });
    if (!ward || ward.cityId !== city.id || ward.level !== (GeoLevel as any).WARD) {
      throw new HttpError(400, "Invalid ward for city");
    }
    if (ward.parentId !== zoneId) throw new HttpError(400, "Ward not under selected zone");

    const pending = await prisma.userRegistrationRequest.findFirst({
      where: { cityId: city.id, email, status: "PENDING" }
    });
    if (pending) throw new HttpError(400, "A pending request already exists for this city");

    const passwordHash = await hashPassword(password);
    await prisma.userRegistrationRequest.create({
      data: {
        cityId: city.id,
        name,
        phone,
        aadhaar: aadharNumber,
        email,
        passwordHash,
        status: "PENDING",
        zoneId,
        wardId,
        requestedModules: []
      }
    });

    res.json({ success: true, message: "Registration request sent to City Admin" });
  } catch (err) {
    next(err);
  }
});

export default router;
