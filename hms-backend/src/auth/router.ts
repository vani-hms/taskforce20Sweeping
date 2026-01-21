import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken } from "./jwt";
import { validateBody } from "../utils/validation";
import { HttpError } from "../utils/errors";
import { Prisma, Role } from "../../generated/prisma";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  cityId: z.string().uuid().optional()
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, cityId } = req.body as z.infer<typeof loginSchema>;
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

    // Build module claims
    const moduleClaims = typedUser.modules
      .filter((m) => !activeCityId || m.cityId === activeCityId)
      .map((m) => ({ moduleId: m.moduleId, roles: [m.role], canWrite: m.canWrite, name: m.module.name }));

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
      redirectTo = `/modules/${first.name.toLowerCase()}`;
    }

    const claims = {
      sub: user.id,
      cityId: activeCityId,
      roles: effectiveRoles,
      modules: moduleClaims.map((m) => ({ moduleId: m.moduleId, roles: m.roles, canWrite: m.canWrite }))
    };
    const token = signAccessToken(claims);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, cityId: activeCityId, roles: effectiveRoles },
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

export default router;
