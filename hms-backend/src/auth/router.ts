import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken } from "./jwt";
import { validateBody } from "../utils/validation";
import { HttpError } from "../utils/errors";
import { Prisma, Role } from "../../generated/prisma";
import { GeoLevel } from "../../generated/prisma";
import { getModuleLabel, normalizeModuleKey } from "../modules/moduleMetadata";
import { resolveCanWrite } from "../utils/moduleAccess";

const router = Router();

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
        where: { cityId: activeCityId, enabled: true },
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
        cityId: activeCityId,
        roles: effectiveRoles,
        modules: moduleClaims.map((m) => ({
          moduleId: m.moduleId,
          key: m.key,
          name: m.name,
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
  zoneId: z.string().uuid().optional(),
  wardId: z.string().uuid().optional(),
  requestedModules: z.array(z.enum(["SWEEP_RES", "SWEEP_COM", "TWINBIN", "TASKFORCE"])).min(1)
});

router.post("/request-registration", validateBody(registrationSchema), async (req, res, next) => {
  try {
    const { name, phone, aadhaar, email, password, cityId, zoneId, wardId, requestedModules } =
      req.body as z.infer<typeof registrationSchema>;

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new HttpError(404, "City not found");

    if (zoneId) {
      const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
      if (!zone || zone.cityId !== cityId || zone.level !== (GeoLevel as any).ZONE) {
        throw new HttpError(400, "Invalid zone for city");
      }
    }
    if (wardId) {
      const ward = await prisma.geoNode.findUnique({ where: { id: wardId } });
      if (!ward || ward.cityId !== cityId || ward.level !== (GeoLevel as any).WARD) {
        throw new HttpError(400, "Invalid ward for city");
      }
      if (zoneId && ward.parentId !== zoneId) throw new HttpError(400, "Ward not under selected zone");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new HttpError(400, "User already exists");

    const hashed = await hashPassword(password);
    const request = await prisma.userRegistrationRequest.create({
      data: {
        name,
        phone,
        aadhaar,
        email,
        passwordHash: hashed,
        cityId,
        zoneId: zoneId || null,
        wardId: wardId || null,
        requestedModules,
        status: "PENDING"
      }
    });
    res.json({ requestId: request.id, status: request.status });
  } catch (err) {
    next(err);
  }
});

export default router;
