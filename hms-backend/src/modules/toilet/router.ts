import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
import { Role, ToiletStatus, ToiletType, ToiletGender, InspectionStatus } from "../../../generated/prisma";
import { validateBody } from "../../utils/validation";
import { HttpError } from "../../utils/errors";
import { getModuleIdByName } from "../moduleRegistry";
import { getQcScope } from "../../utils/qcScope";

const router = Router();
const MODULE_KEY = "TOILET";

router.use(authenticate, requireCityContext());

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const registerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CT', 'PT', 'URINALS']),
  gender: z.enum(['MALE', 'FEMALE', 'UNISEX', 'DISABLED', 'DIFFERENTLY_ABLED']),
  wardId: z.string().uuid().optional(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  code: z.string().optional(),
  operatorName: z.string().optional(),
  numberOfSeats: z.number().optional()
});

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const fs = require('fs');
    const logMsg = `[${new Date().toISOString()}] [TOILET_REG] Incoming request: ${JSON.stringify(req.body)}\n`;
    fs.appendFileSync('debug_log.txt', logMsg);
    console.log(`[TOILET_REG] Incoming request:`, req.body);
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const payload = req.body as z.infer<typeof registerSchema>;

    const toilet = await prisma.toilet.create({
      data: {
        cityId,
        requestedById: userId,
        wardId: payload.wardId,
        name: payload.name,
        type: payload.type,
        gender: payload.gender,
        code: payload.code && payload.code.trim().length > 0 ? payload.code : undefined,
        operatorName: payload.operatorName,
        numberOfSeats: payload.numberOfSeats,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
        status: ToiletStatus.PENDING
      }
    });

    res.json({ toilet });
  } catch (err) {
    next(err);
  }
});

router.get("/my-requests", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const toilets = await prisma.toilet.findMany({
      where: { cityId, requestedById: userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ toilets });
  } catch (err) {
    next(err);
  }
});

router.get("/pending", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const roles = req.auth!.roles || [];
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.CITY_ADMIN]);

    const isOnlyQC = roles.includes(Role.QC) && !roles.includes(Role.CITY_ADMIN) && !roles.includes(Role.HMS_SUPER_ADMIN);

    let scopeFilter: any = {};
    if (isOnlyQC) {
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (scope.zoneIds.length > 0 || scope.wardIds.length > 0) {
        scopeFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
      }
    }

    const toilets = await prisma.toilet.findMany({
      where: {
        cityId,
        status: ToiletStatus.PENDING,
        ...scopeFilter
      },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } }
      }
    });

    console.log(`[TOILET_PENDING] cityId: ${cityId}, user: ${req.auth?.sub}, found: ${toilets.length}`);
    res.json({ toilets });
  } catch (err) {
    next(err);
  }
});

const bulkImportSchema = z.object({
  csvText: z.string()
});

router.post("/bulk-import", validateBody(bulkImportSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const { csvText } = req.body as z.infer<typeof bulkImportSchema>;
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return res.json({ count: 0 });

    // Name,Zone Name,Ward Name,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address
    let count = 0;

    // Cache for GeoNodes to avoid repetitive DB calls
    const zoneCache = new Map<string, string>(); // Name -> ID
    const wardCache = new Map<string, string>(); // Name -> ID

    async function getOrCreateZone(name: string): Promise<string> {
      const key = name.toUpperCase();
      if (zoneCache.has(key)) return zoneCache.get(key)!;

      let zone = await prisma.geoNode.findFirst({
        where: { cityId, level: "ZONE", name: { equals: name, mode: "insensitive" } }
      });

      if (!zone) {
        zone = await prisma.geoNode.create({
          data: {
            cityId,
            level: "ZONE",
            name: name,
            parentId: null, // Zones are top-level under City in this simplified model
            path: cityId // Path usually starts with root, here simplified
          }
        });
      }
      zoneCache.set(key, zone.id);
      return zone.id;
    }

    async function getOrCreateWard(name: string, zoneId: string): Promise<string> {
      const key = `${zoneId}:${name.toUpperCase()}`;
      if (wardCache.has(key)) return wardCache.get(key)!;

      let ward = await prisma.geoNode.findFirst({
        where: { cityId, level: "WARD", parentId: zoneId, name: { equals: name, mode: "insensitive" } }
      });

      if (!ward) {
        ward = await prisma.geoNode.create({
          data: {
            cityId,
            level: "WARD",
            name: name,
            parentId: zoneId,
            path: `${cityId}.${zoneId}`
          }
        });
      }
      wardCache.set(key, ward.id);
      return ward.id;
    }

    // Process sequentially to ensure GeoNodes are created before repeated use
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      if (values.length < 10) continue;

      const [name, zoneName, wardName, typeStr, genderStr, code, operatorName, seats, lat, lon, ...addressParts] = values;
      const address = addressParts.join(",");

      if (!name || !zoneName || !wardName) continue; // Skip invalid rows

      try {
        const zoneId = await getOrCreateZone(zoneName);
        const wardId = await getOrCreateWard(wardName, zoneId);

        let gender: ToiletGender = ToiletGender.UNISEX;
        const gInput = genderStr?.toUpperCase();
        if (gInput === "MALE") gender = ToiletGender.MALE;
        else if (gInput === "FEMALE") gender = ToiletGender.FEMALE;
        else if (gInput === "ALL" || gInput === "UNISEX") gender = ToiletGender.UNISEX;
        else if (gInput === "DISABLED" || gInput === "DIFFERENTLY_ABLED" || gInput === "DIFFERENTLY ABLED") gender = ToiletGender.DIFFERENTLY_ABLED;

        let type: ToiletType = ToiletType.CT;
        if (typeStr?.toUpperCase() === "PT") type = ToiletType.PT;
        else if (typeStr?.toUpperCase() === "URINALS" || typeStr?.toUpperCase() === "URINAL") type = ToiletType.URINALS;

        await prisma.toilet.create({
          data: {
            cityId,
            requestedById: userId,
            wardId,
            zoneId, // Store Zone ID as well for easier filtering
            name,
            type,
            gender,
            code: code || null,
            operatorName: operatorName || null,
            numberOfSeats: parseInt(seats) || 0,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            address: address || null,
            status: ToiletStatus.APPROVED
          }
        });
        count++;
      } catch (e) {
        console.error(`Row ${i} failed:`, e);
      }
    }

    res.json({ count });
  } catch (err) {
    next(err);
  }
});

const approveSchema = z.object({
  assignedEmployeeIds: z.array(z.string().uuid()).optional()
});

router.post("/:id/approve", validateBody(approveSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.CITY_ADMIN]);

    const { assignedEmployeeIds = [] } = req.body as z.infer<typeof approveSchema>;
    const toilet = await prisma.toilet.findUnique({ where: { id: req.params.id as string } });
    if (!toilet || toilet.cityId !== cityId) throw new HttpError(404, "Toilet not found");

    const updated = await prisma.toilet.update({
      where: { id: toilet.id },
      data: {
        status: ToiletStatus.APPROVED,
        assignedEmployeeIds
      }
    });

    if (assignedEmployeeIds.length) {
      await prisma.toiletAssignment.createMany({
        data: assignedEmployeeIds.map(empId => ({
          cityId,
          toiletId: toilet.id,
          employeeId: empId,
          category: toilet.type === ToiletType.CT ? "CT" : (toilet.type === ToiletType.URINALS ? "URINAL" : "PT")
        })),
        skipDuplicates: true
      });
    }

    res.json({ toilet: updated });
  } catch (err) {
    next(err);
  }
});

router.get("/assigned", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const toilets = await prisma.toilet.findMany({
      where: {
        cityId,
        status: ToiletStatus.APPROVED,
        assignedEmployeeIds: { has: userId }
      },
      orderBy: { createdAt: "desc" },
      include: {
        inspections: {
          where: {
            employeeId: userId,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true }
        }
      }
    });

    const enriched = toilets.map(t => ({
      ...t,
      lastInspectionStatus: t.inspections[0]?.status || null,
      inspections: undefined // Remove helper field
    }));

    res.json({ toilets: enriched });
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const roles = req.auth!.roles || [];
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.EMPLOYEE, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const isSuperAdmin = roles.includes(Role.HMS_SUPER_ADMIN);
    const isCityAdmin = roles.includes(Role.CITY_ADMIN);
    const isQC = roles.includes(Role.QC);
    const isAO = roles.includes(Role.ACTION_OFFICER);
    const isEmployee = roles.includes(Role.EMPLOYEE);

    const isOnlyQCorAO = (isQC || isAO) && !isCityAdmin && !isSuperAdmin;

    if (isEmployee && !isCityAdmin && !isQC && !isAO && !isSuperAdmin) {
      const totalToilets = await prisma.toilet.count({
        where: { cityId, assignedEmployeeIds: { has: userId } }
      });

      const wardGroups = await prisma.toilet.groupBy({
        by: ['wardId'],
        where: { cityId, assignedEmployeeIds: { has: userId }, wardId: { not: null } }
      });

      const pendingReports = await prisma.toiletInspection.count({
        where: { cityId, employeeId: userId, status: InspectionStatus.SUBMITTED }
      });

      const approvedReports = await prisma.toiletInspection.count({
        where: { cityId, employeeId: userId, status: InspectionStatus.APPROVED }
      });

      const totalAssigned = await prisma.toilet.count({
        where: { cityId, assignedEmployeeIds: { has: userId }, status: ToiletStatus.APPROVED }
      });
      const totalRequested = await prisma.toilet.count({
        where: { cityId, requestedById: userId }
      });
      const totalSubmitted = await prisma.toiletInspection.count({
        where: { cityId, employeeId: userId, status: InspectionStatus.SUBMITTED }
      });
      const totalApproved = await prisma.toiletInspection.count({
        where: { cityId, employeeId: userId, status: InspectionStatus.APPROVED }
      });
      const totalRejected = await prisma.toiletInspection.count({
        where: { cityId, employeeId: userId, status: InspectionStatus.REJECTED }
      });

      const totalDecided = totalApproved + totalRejected;
      let review = "Not Rated";
      if (totalDecided > 0) {
        const ratio = totalApproved / totalDecided;
        if (ratio >= 0.8) review = "Excellent";
        else if (ratio >= 0.6) review = "Satisfactory";
        else review = "Needs Improvement";
      } else if (totalSubmitted > 0) {
        review = "Pending Review";
      }

      const cityObj = await prisma.city.findUnique({ where: { id: cityId }, select: { name: true } });
      const userCity = await prisma.userCity.findFirst({ where: { userId, cityId } });
      let wardNames = "";
      let wardIds: string[] = [];
      if (userCity?.wardIds?.length) {
        wardIds = userCity.wardIds;
        const wNodes = await prisma.geoNode.findMany({ where: { id: { in: wardIds } }, select: { name: true } });
        wardNames = wNodes.map(n => n.name).join(", ");
      }

      // Fetch QC and AO
      const qcUsers = await prisma.userCity.findMany({
        where: { cityId, role: Role.QC },
        include: { user: { select: { name: true, phone: true } } }
      });
      const aoUsers = await prisma.userCity.findMany({
        where: { cityId, role: Role.ACTION_OFFICER },
        include: { user: { select: { name: true, phone: true } } }
      });

      const supportStaff = {
        qc: qcUsers.map(u => ({ name: u.user.name, phone: u.user.phone })),
        ao: aoUsers.map(u => ({ name: u.user.name, phone: u.user.phone }))
      };

      return res.json({
        cityName: cityObj?.name,
        wardNames,
        totalAssigned,
        totalRequested,
        totalSubmitted,
        totalApproved,
        performance: review,
        // Keep existing for backward compat if any
        totalToilets: totalAssigned,
        totalWards: wardGroups.length,
        pendingReports,
        approvedReports,
        supportStaff
      });
    }

    // Role.QC or Role.ACTION_OFFICER or Role.CITY_ADMIN
    let scopeFilter: any = {};
    if (isOnlyQCorAO) {
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (scope.zoneIds.length > 0 || scope.wardIds.length > 0) {
        scopeFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
      }
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const baseWhere = { cityId, ...scopeFilter };
    const inspectionBaseWhere = { cityId, toilet: scopeFilter };

    const customStartQuery = req.query.startDate ? new Date(req.query.startDate as string) : null;
    const customEndQuery = req.query.endDate ? new Date(req.query.endDate as string) : (customStartQuery ? new Date(customStartQuery.getTime() + 86400000) : null);

    const [
      totalToilets,
      totalZones,
      totalWards,
      onDutyEmployees,
      todayInspections,
      todayRegistrations,
      approvedInspections,
      rejectedInspections,
      todayStats,
      weekStats,
      monthStats,
      customStats,
      qcCount,
      aoCount,
      currentUser
    ] = await Promise.all([
      prisma.toilet.count({ where: baseWhere }),
      prisma.geoNode.count({ where: { cityId, level: 'ZONE', ...(isOnlyQCorAO && scopeFilter.OR ? { id: { in: (scopeFilter.OR[0].zoneId.in || []) } } : {}) } }),
      prisma.geoNode.count({ where: { cityId, level: 'WARD', ...(isOnlyQCorAO && scopeFilter.OR ? { id: { in: (scopeFilter.OR[1].wardId.in || []) } } : {}) } }),
      prisma.toiletAssignment.groupBy({
        by: ['employeeId'],
        where: { cityId, toilet: scopeFilter }
      }).then(groups => groups.length),
      prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, createdAt: { gte: startOfToday } } }),
      prisma.toilet.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
      prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.APPROVED } }),
      prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.REJECTED } }),

      Promise.all([
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, createdAt: { gte: startOfToday } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.APPROVED, createdAt: { gte: startOfToday } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.REJECTED, createdAt: { gte: startOfToday } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.SUBMITTED, createdAt: { gte: startOfToday } } }),
      ]),
      Promise.all([
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, createdAt: { gte: startOfWeek } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.APPROVED, createdAt: { gte: startOfWeek } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.REJECTED, createdAt: { gte: startOfWeek } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.SUBMITTED, createdAt: { gte: startOfWeek } } }),
      ]),
      Promise.all([
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, createdAt: { gte: startOfMonth } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.APPROVED, createdAt: { gte: startOfMonth } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.REJECTED, createdAt: { gte: startOfMonth } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.SUBMITTED, createdAt: { gte: startOfMonth } } }),
      ]),
      customStartQuery ? Promise.all([
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, createdAt: { gte: customStartQuery, lt: customEndQuery! } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.APPROVED, createdAt: { gte: customStartQuery, lt: customEndQuery! } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.REJECTED, createdAt: { gte: customStartQuery, lt: customEndQuery! } } }),
        prisma.toiletInspection.count({ where: { ...inspectionBaseWhere, status: InspectionStatus.SUBMITTED, createdAt: { gte: customStartQuery, lt: customEndQuery! } } }),
      ]) : Promise.resolve(null),
      prisma.userCity.count({ where: { cityId, role: Role.QC } }),
      prisma.userCity.count({ where: { cityId, role: Role.ACTION_OFFICER } }),
      prisma.user.findUnique({ where: { id: req.auth!.sub }, select: { name: true } })
    ]);

    res.json({
      employeeName: currentUser?.name,
      totalToilets,
      totalZones,
      totalWards,
      onDutyEmployees,
      todayInspections,
      todayRegistrations,
      approvedInspections,
      rejectedInspections,
      qcCount,
      aoCount,
      today: { submitted: todayStats[0], approved: todayStats[1], rejected: todayStats[2], actionRequired: todayStats[3] },
      week: { submitted: weekStats[0], approved: weekStats[1], rejected: weekStats[2], actionRequired: weekStats[3] },
      month: { submitted: monthStats[0], approved: monthStats[1], rejected: monthStats[2], actionRequired: monthStats[3] },
      custom: customStats ? { submitted: customStats[0], approved: customStats[1], rejected: customStats[2], actionRequired: customStats[3] } : null,
      // compatibility
      pendingReview: todayStats[3],
      inspectionsDone: todayStats[1]
    });
  } catch (err) {
    next(err);
  }
});

router.get("/inspection-questions", async (req, res, next) => {
  try {
    const toiletId = req.query.toiletId as string | undefined;

    let toiletType: ToiletType | undefined;
    if (toiletId) {
      const toilet = await prisma.toilet.findUnique({ where: { id: toiletId }, select: { type: true } });
      if (toilet) toiletType = toilet.type as ToiletType;
    }

    const questions = await prisma.toiletInspectionQuestion.findMany({
      where: {
        isActive: true,
        OR: [
          { forType: toiletType },
          { forType: null }
        ]
      },
      orderBy: { order: "asc" }
    });
    res.json({ questions });
  } catch (err) {
    next(err);
  }
});

const inspectionSchema = z.object({
  toiletId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  answers: z.any()
});

router.post("/inspections/submit", validateBody(inspectionSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const { toiletId, latitude, longitude, answers } = req.body as z.infer<typeof inspectionSchema>;
    const toilet = await prisma.toilet.findUnique({ where: { id: toiletId } });
    if (!toilet || toilet.cityId !== cityId) throw new HttpError(404, "Toilet not found");

    const distance = haversineMeters(latitude, longitude, toilet.latitude, toilet.longitude);

    const inspection = await prisma.toiletInspection.create({
      data: {
        cityId,
        toiletId,
        employeeId: userId,
        latitude,
        longitude,
        distanceMeters: distance,
        answers,
        status: InspectionStatus.SUBMITTED
      }
    });

    res.json({ inspection });
  } catch (err) {
    next(err);
  }
});

router.get("/reports/summary", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const roles = req.auth!.roles || [];
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const isOnlyQCorAO = (roles.includes(Role.QC) || roles.includes(Role.ACTION_OFFICER)) &&
      !roles.includes(Role.CITY_ADMIN) &&
      !roles.includes(Role.HMS_SUPER_ADMIN);

    let scopeFilter: any = {};
    if (isOnlyQCorAO) {
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (scope.zoneIds.length > 0 || scope.wardIds.length > 0) {
        scopeFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
      }
    }

    const statuses = Object.values(InspectionStatus);
    const summary = await Promise.all(statuses.map(async (status) => {
      const count = await prisma.toiletInspection.count({
        where: {
          cityId,
          status,
          toilet: scopeFilter
        }
      });
      return { status, count };
    }));

    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

router.get("/all", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const roles = req.auth!.roles || [];
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const isOnlyQCorAO = (roles.includes(Role.QC) || roles.includes(Role.ACTION_OFFICER)) &&
      !roles.includes(Role.CITY_ADMIN) &&
      !roles.includes(Role.HMS_SUPER_ADMIN);

    let scopeFilter: any = {};
    if (isOnlyQCorAO) {
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (scope.zoneIds.length > 0 || scope.wardIds.length > 0) {
        scopeFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
      }
    }

    const toiletsRaw = await prisma.toilet.findMany({
      where: {
        cityId,
        ...scopeFilter
      },
      include: {
        requestedBy: { select: { name: true } },
        assignments: {
          include: { employee: { select: { name: true, email: true } } },
          orderBy: { assignedAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const wardIds = Array.from(new Set(toiletsRaw.map(t => t.wardId).filter(Boolean))) as string[];
    const zoneIds = Array.from(new Set(toiletsRaw.map(t => t.zoneId).filter(Boolean))) as string[];

    const geoNodes = await prisma.geoNode.findMany({
      where: { id: { in: [...wardIds, ...zoneIds] } },
      include: { parent: { select: { name: true } } }
    });

    const geoMap = new Map(geoNodes.map(n => [n.id, n]));

    const toilets = toiletsRaw.map(t => ({
      ...t,
      ward: t.wardId ? {
        name: geoMap.get(t.wardId)?.name,
        parent: geoMap.get(t.wardId)?.parent ? { name: geoMap.get(t.wardId)?.parent?.name } : (t.zoneId ? { name: geoMap.get(t.zoneId)?.name } : null)
      } : null
    }));

    console.log(`[TOILET_ALL] cityId: ${cityId}, user: ${req.auth?.sub}, found: ${toilets.length}`);
    res.json({ toilets });
  } catch (err) {
    next(err);
  }
});



const bulkAssignSchema = z.object({
  employeeId: z.string().uuid(),
  toiletIds: z.array(z.string().uuid()),
  category: z.string().optional()
});

router.post("/assignments/bulk", validateBody(bulkAssignSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const { employeeId, toiletIds, category } = req.body as z.infer<typeof bulkAssignSchema>;

    // 1. Update Toilet model's assignedEmployeeIds for all selected toilets
    // We use a transaction to ensure consistency
    await prisma.$transaction(
      toiletIds.map(id =>
        prisma.toilet.update({
          where: { id },
          data: {
            assignedEmployeeIds: {
              set: [employeeId]
            }
          }
        })
      )
    );

    // 2. Create detailed assignments
    await prisma.toiletAssignment.createMany({
      data: toiletIds.map(id => ({
        cityId,
        toiletId: id,
        employeeId,
        category: category || "GENERAL"
      })),
      skipDuplicates: true
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post("/assignments/remove", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const { employeeId, toiletId } = req.body;
    console.log(`[TOILET_UNASSIGN] req: employeeId=${employeeId}, toiletId=${toiletId}, city=${cityId}`);

    if (!employeeId || !toiletId) {
      console.warn(`[TOILET_UNASSIGN] Missing fields`);
      throw new HttpError(400, "employeeId and toiletId are required");
    }

    const toilet = await prisma.toilet.findUnique({
      where: { id: toiletId },
      select: { id: true, assignedEmployeeIds: true }
    });

    if (!toilet) {
      console.warn(`[TOILET_UNASSIGN] Toilet ${toiletId} not found`);
      throw new HttpError(404, "Toilet not found");
    }

    const assignment = await prisma.toiletAssignment.findUnique({
      where: { toiletId_employeeId: { toiletId, employeeId } }
    });
    console.log(`[TOILET_UNASSIGN] Assignment exists: ${!!assignment}`);

    const updatedIds = toilet.assignedEmployeeIds.filter(id => id !== employeeId);

    await prisma.$transaction([
      prisma.toilet.update({
        where: { id: toiletId },
        data: {
          assignedEmployeeIds: {
            set: updatedIds
          }
        }
      }),
      prisma.toiletAssignment.deleteMany({
        where: {
          toiletId,
          employeeId,
          cityId
        }
      })
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/inspections", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const roles = req.auth!.roles || [];
    const status = req.query.status as InspectionStatus | undefined;
    const employeeId = req.query.employeeId as string | undefined;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.EMPLOYEE, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const isEmployeeOnly = roles.includes(Role.EMPLOYEE) &&
      !roles.includes(Role.QC) &&
      !roles.includes(Role.ACTION_OFFICER) &&
      !roles.includes(Role.CITY_ADMIN);

    const isOnlyQCorAO = (roles.includes(Role.QC) || roles.includes(Role.ACTION_OFFICER)) &&
      !roles.includes(Role.CITY_ADMIN) &&
      !roles.includes(Role.HMS_SUPER_ADMIN);

    let scopeFilter: any = {};
    if (isOnlyQCorAO) {
      const scope = await getQcScope({ userId, cityId, moduleId });
      if (scope.zoneIds.length > 0 || scope.wardIds.length > 0) {
        scopeFilter = {
          OR: [
            { zoneId: { in: scope.zoneIds } },
            { wardId: { in: scope.wardIds } }
          ]
        };
      }
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const skip = (page - 1) * pageSize;

    const where = {
      cityId,
      ...(status ? { status } : {}),
      ...(employeeId ? { employeeId } : (isEmployeeOnly ? { employeeId: req.auth!.sub } : {})),
      toilet: scopeFilter
    };

    const [total, inspections] = await Promise.all([
      prisma.toiletInspection.count({ where }),
      prisma.toiletInspection.findMany({
        where,
        include: {
          toilet: true,
          employee: { select: { name: true, email: true } },
          reviewedByQc: { select: { name: true } },
          actionTakenBy: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      })
    ]);

    console.log(`[INSPECTIONS] cityId: ${cityId}, status: ${status}, page: ${page}, found: ${inspections.length}/${total}`);
    res.json({ inspections, total, page, pageSize });
  } catch (err) {
    next(err);
  }
});

router.get("/inspections/:id", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const inspection = await prisma.toiletInspection.findUnique({
      where: { id: req.params.id as string },
      include: {
        toilet: true,
        employee: { select: { id: true, name: true, email: true } },
        reviewedByQc: { select: { name: true } },
        actionTakenBy: { select: { name: true } }
      }
    });

    if (!inspection || inspection.cityId !== cityId) throw new HttpError(404, "Inspection not found");

    // Resolve Geo Names
    let zoneName = "---";
    let wardName = "---";
    if (inspection.toilet.zoneId || inspection.toilet.wardId) {
      const ids = [inspection.toilet.zoneId, inspection.toilet.wardId].filter(id => id) as string[];
      const nodes = await prisma.geoNode.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true }
      });
      const nodeMap = new Map(nodes.map(n => [n.id, n.name]));
      if (inspection.toilet.zoneId) zoneName = nodeMap.get(inspection.toilet.zoneId) || "---";
      if (inspection.toilet.wardId) wardName = nodeMap.get(inspection.toilet.wardId) || "---";
    }

    const { toilet, ...rest } = inspection;
    const enrichedToilet = { ...toilet, zoneName, wardName };

    res.json({ inspection: { ...rest, toilet: enrichedToilet } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const toilet = await prisma.toilet.findUnique({
      where: { id: req.params.id as string },
      include: {
        requestedBy: { select: { name: true, email: true } },
        assignments: {
          include: { employee: { select: { name: true, email: true } } },
          orderBy: { assignedAt: "desc" }
        },
        inspections: {
          include: { employee: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    });

    if (!toilet || toilet.cityId !== cityId) throw new HttpError(404, "Toilet not found");
    res.json({ toilet });
  } catch (err) {
    next(err);
  }
});

const reviewSchema = z.object({
  status: z.nativeEnum(InspectionStatus),
  comment: z.string().optional()
});

router.post("/inspections/:id/review", validateBody(reviewSchema), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userRoles = req.auth!.roles;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.ACTION_OFFICER, Role.CITY_ADMIN]);

    const { status, comment } = req.body as z.infer<typeof reviewSchema>;
    const inspectionId = req.params.id;

    const inspection = await prisma.toiletInspection.findUnique({ where: { id: inspectionId } });
    if (!inspection || inspection.cityId !== cityId) throw new HttpError(404, "Inspection not found");

    const isQC = userRoles.includes(Role.QC) || userRoles.includes(Role.CITY_ADMIN) || userRoles.includes(Role.HMS_SUPER_ADMIN);
    const isAO = userRoles.includes(Role.ACTION_OFFICER);

    if (!isQC && !isAO) throw new HttpError(403, "Not authorized to review");

    const updateData: any = { status };

    if (isQC) {
      updateData.reviewedByQcId = userId;
      if (status === InspectionStatus.ACTION_REQUIRED || status === InspectionStatus.REJECTED) {
        updateData.qcComment = comment;
      }
    } else if (isAO && !isQC) { // Ensure pure AO restricted
      if (inspection.status !== InspectionStatus.ACTION_REQUIRED) throw new HttpError(400, "Action Officer can only review items marked Action Required");

      updateData.actionTakenById = userId;

      if (status === InspectionStatus.REJECTED) {
        updateData.actionNote = comment;
      } else if (status !== InspectionStatus.APPROVED) {
        throw new HttpError(400, "Invalid status for Action Officer review (Must be APPROVED or REJECTED)");
      }
    }

    const updated = await prisma.toiletInspection.update({
      where: { id: inspectionId },
      data: updateData
    });

    res.json({ inspection: updated });
  } catch (e) { next(e); }
});

export default router;
