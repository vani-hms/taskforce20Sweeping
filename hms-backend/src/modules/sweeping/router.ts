// SAME IMPORTS – no new Prisma fields

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
import { Role } from "../../../generated/prisma";
import { validateBody } from "../../utils/validation";
import { HttpError } from "../../utils/errors";
import { getModuleIdByName } from "../moduleRegistry";
import multer from "multer";
import fs from "fs";
import { DOMParser } from "@xmldom/xmldom";
import toGeoJSON from "@tmcw/togeojson";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

const router = Router();
router.use(authenticate, requireCityContext());

const MODULE_KEY = "SWEEPING";
const upload = multer({ dest: "uploads/" });

/* ================= ADMIN UPLOAD KML ================= */

router.post("/admin/upload-kml", upload.single("file"), async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    if (!req.file) throw new HttpError(400, "KML required");

    const kml = fs.readFileSync(req.file.path, "utf8");
    const dom = new DOMParser().parseFromString(kml);
    const geo = toGeoJSON.kml(dom);

    let created = 0;

    for (const f of geo.features) {
      if (!f.geometry) {
        console.log("⛔ Skipped feature – no geometry");
        continue;
      }

      const beatName = f.properties?.name || "Beat";

      console.log("\n🧹 Processing Beat:", beatName);

      const wardMatch =
        beatName.match(/ward\s*(\d+)/i) ||
        beatName.match(/(\d+)/);

      if (!wardMatch) {
        console.log("⛔ Ward not detected from beat name:", beatName);
        continue;
      }

      const wardNode = await prisma.geoNode.findFirst({
        where: {
          cityId,
          level: "WARD",
          name: { contains: wardMatch[1], mode: "insensitive" }
        }
      });

      if (!wardNode) {
        console.log("⛔ Ward NOT FOUND in DB:", wardMatch[1]);
        continue;
      }

      console.log("✅ Ward matched:", wardNode.name);

      const geom: any = f.geometry;

      const coords =
        geom.type === "Polygon"
          ? geom.coordinates[0]
          : geom.type === "MultiPolygon"
            ? geom.coordinates[0][0]
            : null;

      if (!coords) {
        console.log("⛔ Unsupported geometry type");
        continue;
      }

      const lat =
        coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;

      const lng =
        coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;

      console.log("📍 Beat center:", lat, lng);

      const beatNode = await prisma.geoNode.create({
        data: {
          cityId,
          parentId: wardNode.id,
          level: "BEAT",
          name: beatName,
          path: `BEAT_${Date.now()}`,
          areaType: "RESIDENTIAL"
        }
      });

      await prisma.sweepingBeat.create({
        data: {
          cityId,
          geoNodeBeatId: beatNode.id,
          areaType: "RESIDENTIAL",
          latitude: lat,
          longitude: lng,
          radiusMeters: 10,
          polygonGeoJson: JSON.parse(JSON.stringify(f.geometry))
        }
      });

      console.log("✅ Beat CREATED:", beatName, "under ward:", wardNode.name);

      created++;
    }


    fs.unlinkSync(req.file.path);
    res.json({ createdBeats: created });
  } catch (e) { next(e); }
});

/* ================= ADMIN DASHBOARD ================= */

/* ================= ADMIN UNIFIED DASHBOARD ================= */

router.get("/admin/dashboard", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const cityId = req.auth!.cityId!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* ================= SUMMARY ================= */

    const totalBeats = await prisma.sweepingBeat.count({ where: { cityId } });

    const inspectionsToday = await prisma.sweepingInspection.findMany({
      where: { cityId, inspectionDate: { gte: today } },
      include: {
        sweepingBeat: {
          include: {
            geoNodeBeat: {
              include: {
                parent: { include: { parent: true } } // BEAT → WARD → ZONE
              }
            }
          }
        },
        employee: true
      }
    });

    const inspectedToday = inspectionsToday.length;
    const approvedToday = inspectionsToday.filter(i => i.status === "APPROVED").length;

    const actionRequired = await prisma.sweepingInspection.count({
      where: { cityId, status: "ACTION_REQUIRED" }
    });

    const photosToday = await prisma.sweepingInspectionPhoto.count({
      where: { createdAt: { gte: today } }
    });

    const coveragePercent =
      totalBeats === 0 ? 0 : Math.round((inspectedToday / totalBeats) * 100);

    /* ================= BEATS ================= */

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId },
      include: {
        geoNodeBeat: {
          include: {
            parent: { include: { parent: true } }
          }
        }
      }
    });

    /* ================= WARD STATS ================= */

    const wardMap: any = {};

    for (const i of inspectionsToday) {
      const ward = i.sweepingBeat.geoNodeBeat.parent;
      if (!ward) continue;

      wardMap[ward.id] ||= { wardName: ward.name, totalBeats: 0, inspected: 0 };
      wardMap[ward.id].inspected++;
    }

    for (const b of beats) {
      const ward = b.geoNodeBeat.parent;
      if (!ward) continue;

      wardMap[ward.id] ||= { wardName: ward.name, totalBeats: 0, inspected: 0 };
      wardMap[ward.id].totalBeats++;
    }

    const wardStats = Object.values(wardMap).map((w: any) => ({
      ...w,
      completionPercent:
        w.totalBeats === 0 ? 0 : Math.round((w.inspected / w.totalBeats) * 100)
    }));

    /* ================= ZONE RANKING ================= */

    const zoneMap: any = {};

    for (const b of beats) {
      const ward = b.geoNodeBeat.parent;
      const zone = ward?.parent;
      if (!zone) continue;

      zoneMap[zone.id] ||= { zoneName: zone.name, totalBeats: 0, inspected: 0 };
      zoneMap[zone.id].totalBeats++;
    }

    for (const i of inspectionsToday) {
      const ward = i.sweepingBeat.geoNodeBeat.parent;
      const zone = ward?.parent;
      if (!zone) continue;

      zoneMap[zone.id].inspected++;
    }

    let zoneRanking = Object.values(zoneMap).map((z: any) => ({
      zoneName: z.zoneName,
      totalBeats: z.totalBeats,
      inspected: z.inspected,
      completionPercent:
        z.totalBeats === 0 ? 0 : Math.round((z.inspected / z.totalBeats) * 100)
    }));

    zoneRanking.sort((a: any, b: any) => b.completionPercent - a.completionPercent);

    zoneRanking = zoneRanking.map((z: any, i: number) => ({
      ...z,
      rank: i + 1
    }));

    /* ================= EMPLOYEE PERFORMANCE ================= */

    const empMap: any = {};

    for (const i of inspectionsToday) {
      const e = i.employee;
      if (!e) continue;

      empMap[e.id] ||= { name: e.name, total: 0, approved: 0, action: 0 };
      empMap[e.id].total++;
      if (i.status === "APPROVED") empMap[e.id].approved++;
      if (i.status === "ACTION_REQUIRED") empMap[e.id].action++;
    }

    const employeePerformance = Object.values(empMap).map((e: any) => ({
      name: e.name,
      inspections: e.total,
      approvalRate: Math.round((e.approved / e.total) * 100 || 0),
      actionRequiredRate: Math.round((e.action / e.total) * 100 || 0)
    }));
    /* ================= QC PERFORMANCE ================= */

    const qc = await prisma.sweepingInspection.findMany({
      where: {
        cityId,
        qcReviewedAt: { not: null }
      }
    });

    const qcPerformance = {
      reviewedToday: qc.filter(q => q.qcReviewedAt && q.qcReviewedAt >= today).length
    };

    /* ================= ACTION OFFICER ================= */

    const ao = await prisma.sweepingActionResponse.findMany({
      where: {
        cityId,
        submittedAt: { gte: today }
      }
    });

    const actionOfficerStats = {
      resolvedToday: ao.length
    };

    /* ================= LIVE FEED ================= */

    const liveFeed = await prisma.sweepingInspection.findMany({
      where: { cityId },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        sweepingBeat: {
          include: {
            geoNodeBeat: {
              include: {
                parent: true
              }
            }
          }
        },
        employee: true
      }
    });

    /* ================= ALERTS ================= */

    const alerts = wardStats
      .filter((w: any) => w.inspected < w.totalBeats)
      .map((w: any) => ({
        wardName: w.wardName,
        pending: w.totalBeats - w.inspected
      }));

    /* ================= RESPONSE ================= */
    res.json({
      summary: {
        totalBeats,
        inspectedToday,
        approvedToday,
        actionRequired,
        coveragePercent,
        photosToday
      },
      wardStats,
      zoneRanking,
      employeePerformance,
      qcPerformance,
      actionOfficerStats,
      liveFeed,
      alerts
    });

  } catch (e) {
    next(e);
  }
});

/* ================= ADMIN BEATS ================= */

router.get("/beats", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId: req.auth!.cityId! },
      include: {
        geoNodeBeat: {
          include: { parent: true }
        },
        assignedEmployee: true
      }
    });

    res.json({ beats });
  } catch (e) {
    next(e);
  }
});
/* ================= QC APPROVALS ================= */

router.get("/approvals", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC, Role.CITY_ADMIN]);


    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId: req.auth!.cityId!,
        status: "SUBMITTED"
      },
      include: {
        sweepingBeat: { include: { geoNodeBeat: true } },
        employee: true,
        answers: true,
        photos: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ inspections });
  } catch (e) {
    next(e);
  }
});
/* ================= STAFF ================= */

router.get("/staff", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const users = await prisma.user.findMany({
      where: {
        cities: {
          some: {
            cityId: req.auth!.cityId!
          }
        }
      },
      include: {
        sweepingBeatsAssigned: true
      }
    });

    const staff = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: "EMPLOYEE",
      assignedCount: u.sweepingBeatsAssigned.length
    }));

    res.json({ staff });
  } catch (e) {
    next(e);
  }
});
/* ================= MY STATS ================= */

router.get("/my/stats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, employeeId: userId }
    });

    const approved = inspections.filter(i => i.status === "APPROVED").length;
    const action = inspections.filter(i => i.status === "ACTION_REQUIRED").length;

    res.json({
      total: inspections.length,
      approved,
      actionRequired: action
    });

  } catch (e) {
    next(e);
  }
});
/* ================= MY INSPECTIONS ================= */

router.get("/my/inspections", async (req, res, next) => {
  try {
    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId: req.auth!.cityId!,
        employeeId: req.auth!.sub!
      },
      include: {
        sweepingBeat: { include: { geoNodeBeat: true } },
        photos: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ inspections });
  } catch (e) {
    next(e);
  }
});
/* ================= SWEEPING EMPLOYEES ================= */

router.get("/employees", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

    const employees = await prisma.user.findMany({
      where: {
        cities: {
          some: { cityId: req.auth!.cityId! }
        }
      }
    });

    res.json({ employees });
  } catch (e) {
    next(e);
  }
});

/* ================= BEAT GEOJSON ================= */

router.get("/beats/geo", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [
      Role.CITY_ADMIN,
      Role.QC,
      Role.ACTION_OFFICER
    ]);

    const cityId = req.auth!.cityId!;

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId, isActive: true },
      include: {
        geoNodeBeat: {
          include: { parent: true } // ward
        },
        inspections: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          include: { employee: true }
        }
      }
    });

    const features = beats
      .filter(b => b.polygonGeoJson || (b.latitude && b.longitude))
      .map(b => {
        const latest = b.inspections[0];

        // If polygon exists → use it
        const geometry = b.polygonGeoJson ?? {
          type: "Point",
          coordinates: [b.longitude, b.latitude]
        };

        return {
          type: "Feature",
          geometry,
          properties: {
            beatId: b.id,
            name: b.geoNodeBeat.name,
            ward: b.geoNodeBeat.parent?.name || null,
            status: latest?.status || "NONE",
            employee: latest?.employee?.name || null,
            inspectedAt: latest?.updatedAt || null,
            radius: b.radiusMeters
          }
        };
      });

    res.json({
      type: "FeatureCollection",
      features
    });

  } catch (e) {
    next(e);
  }
});

/* ================= WARD GEOJSON ================= */

router.get("/wards/geo", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const wards = await prisma.geoNode.findMany({
      where: { cityId, level: "WARD" },
      include: {
        children: true
      }
    });

    // assuming ward polygon stored in SweepingBeat OR GeoNode (adjust if needed)
    const features = wards
      .filter(w => (w as any).polygonGeoJson)
      .map(w => ({
        type: "Feature",
        geometry: (w as any).polygonGeoJson,
        properties: {
          wardId: w.id,
          name: w.name
        }
      }));

    res.json({
      type: "FeatureCollection",
      features
    });
  } catch (e) {
    next(e);
  }
});



/* ================= ASSIGN BEAT ================= */

router.post("/admin/assign-beat",
  validateBody(z.object({ sweepingBeatId: z.string(), employeeId: z.string() })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC]);

      const exists = await prisma.sweepingInspection.findFirst({ where: { sweepingBeatId: req.body.sweepingBeatId } });
      if (exists) throw new HttpError(400, "Inspection already submitted");

      const beat = await prisma.sweepingBeat.update({
        where: { id: req.body.sweepingBeatId },
        data: { assignedEmployeeId: req.body.employeeId, assignedAt: new Date() }
      });

      res.json({ beat });
    } catch (e) { next(e) }
  });

/* ================= EMPLOYEE BEATS ================= */

router.get("/employee/beats", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId: req.auth!.cityId!, assignedEmployeeId: req.auth!.sub!, isActive: true },
      select: { id: true, latitude: true, longitude: true, radiusMeters: true, geoNodeBeat: true }
    });

    res.json({ beats });
  } catch (e) { next(e) }
});

/* ================= SUBMIT INSPECTION ================= */

router.post("/inspections/submit",
  validateBody(z.object({
    sweepingBeatId: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    answers: z.array(z.object({
      questionCode: z.string(),
      answer: z.boolean(),
      photos: z.array(z.string())
    }))
  })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

      const exists = await prisma.sweepingInspection.findFirst({ where: { sweepingBeatId: req.body.sweepingBeatId } });
      if (exists) throw new HttpError(400, "Already submitted");

      const beat = await prisma.sweepingBeat.findUnique({ where: { id: req.body.sweepingBeatId } });
      if (!beat) throw new HttpError(404, "Beat not found");

      // const pt = point([req.body.longitude, req.body.latitude]);

      // const MAX_DISTANCE = 1000; // 1 KM tolerance

      // let allowed = false;

      // // polygon check
      // if ((beat as any).polygonGeoJson) {
      //   allowed = booleanPointInPolygon(pt, (beat as any).polygonGeoJson);
      // }

      // // distance from beat center
      // const d = getDistanceMeters(
      //   req.body.latitude,
      //   req.body.longitude,
      //   beat.latitude,
      //   beat.longitude
      // );

      // // allow if inside polygon OR within 1km
      // if (!allowed && d > MAX_DISTANCE) {
      //   throw new HttpError(403, "Outside beat (1km limit exceeded)");
      // }
      // TEMPORARY DEMO MODE – LOCATION CHECK DISABLED
      console.log("⚠️ DEMO MODE: skipping geo fencing for inspection submit");


      const inspection = await prisma.$transaction(async tx => {
        const ins = await tx.sweepingInspection.create({
          data: {
            cityId: req.auth!.cityId!,
            sweepingBeatId: beat.id,
            employeeId: req.auth!.sub!,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            inspectionDate: new Date(),
            status: "SUBMITTED"
          }
        });

        for (const a of req.body.answers) {
          const ans = await tx.sweepingInspectionAnswer.create({
            data: { inspectionId: ins.id, questionCode: a.questionCode, answer: a.answer }
          });
          for (const p of a.photos) {
            await tx.sweepingInspectionPhoto.create({
              data: { inspectionId: ins.id, answerId: ans.id, photoUrl: p }
            });
          }
        }

        return ins;
      });

      res.json({ inspection });
    } catch (e) { next(e) }
  });



/* ================= QC BEATS ================= */

router.get("/qc/beats", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const scope = await prisma.userModuleRole.findFirst({
      where: {
        userId: req.auth!.sub!,
        cityId: req.auth!.cityId!,
        role: Role.QC
      }
    });

    const wardIds = scope?.wardIds || [];

    const beats = await prisma.sweepingBeat.findMany({
      where: {
        cityId: req.auth!.cityId!,
        geoNodeBeat: {
          parentId: { in: wardIds }
        }
      },
      include: {
        geoNodeBeat: true
      }
    });

    res.json({ beats });
  } catch (e) {
    next(e);
  }
});

/* ================= QC INSPECTIONS (WARD SCOPED) ================= */

router.get("/qc/inspections", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const scope = await prisma.userModuleRole.findFirst({
      where: { userId: req.auth!.sub!, cityId: req.auth!.cityId!, role: Role.QC }
    });

    const wardIds = scope?.wardIds || [];

    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId: req.auth!.cityId!,
        sweepingBeat: { geoNodeBeat: { parentId: { in: wardIds } } }
      },
      include: { sweepingBeat: { include: { geoNodeBeat: true } }, employee: true, answers: true, photos: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ inspections });
  } catch (e) { next(e) }
});

/* ================= QC DECISION ================= */

router.post("/qc/inspections/:id/decision",
  validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"]) })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.QC]);

      const updated = await prisma.sweepingInspection.update({
        where: { id: req.params.id },
        data: { status: req.body.decision, qcReviewedById: req.auth!.sub!, qcReviewedAt: new Date() }
      });

      res.json({ inspection: updated });
    } catch (e) { next(e) }
  });

/* ================= ACTION OFFICER (WARD SCOPED) ================= */

// router.get("/action/required", async (req, res, next) => {
//   try {
//     const moduleId = await getModuleIdByName(MODULE_KEY);
//     await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

//     const scope = await prisma.userModuleRole.findFirst({
//       where: { userId: req.auth!.sub!, cityId: req.auth!.cityId!, role: Role.ACTION_OFFICER }
//     });

//     const wardIds = scope?.wardIds || [];

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId: req.auth!.cityId!,
//         status: "ACTION_REQUIRED",
//         sweepingBeat: { geoNodeBeat: { parentId: { in: wardIds } } }
//       },
//       include: { sweepingBeat: true }
//     });

//     res.json({ inspections });
//   } catch (e) { next(e) }
// });
router.get("/action/required", async (req, res, next) => {
  try {
    const moduleId = await getModuleIdByName(MODULE_KEY);
    await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId: req.auth!.cityId!,
        status: "ACTION_REQUIRED"
      },
      include: {
        sweepingBeat: {
          include: { geoNodeBeat: true }
        },
        employee: true,
        answers: true,
        photos: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ inspections });

  } catch (e) {
    next(e);
  }
});


router.post("/action/:inspectionId/respond",
  validateBody(z.object({ remarks: z.string(), photos: z.array(z.string()) })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

      const r = await prisma.sweepingActionResponse.create({
        data: {
          cityId: req.auth!.cityId!,
          inspectionId: req.params.inspectionId,
          actionOfficerId: req.auth!.sub!,
          remarks: req.body.remarks,
          submittedAt: new Date()
        }
      });

      for (const p of req.body.photos) {
        await prisma.sweepingInspectionPhoto.create({
          data: { inspectionId: req.params.inspectionId, photoUrl: p }
        });
      }

      await prisma.sweepingInspection.update({
        where: { id: req.params.inspectionId },
        data: { status: "ACTION_SUBMITTED" }
      });

      res.json({ actionResponse: r });
    } catch (e) { next(e) }
  });

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
