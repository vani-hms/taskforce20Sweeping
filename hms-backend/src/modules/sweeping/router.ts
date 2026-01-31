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


const router = Router();
router.use(authenticate, requireCityContext());
function buildScopeFilters(scope: { zoneIds: string[]; wardIds: string[] }) {
  const zoneFilter =
    scope.zoneIds.length === 0
      ? undefined
      : {
        OR: [{ zoneId: { in: scope.zoneIds } }, { zoneId: null }]
      };
  const wardFilter =
    scope.wardIds.length === 0
      ? undefined
      : {
        OR: [{ wardId: { in: scope.wardIds } }, { wardId: null }]
      };
  return { zoneFilter, wardFilter };
}


const MODULE_KEY = "SWEEPING";

const upload = multer({ dest: "uploads/" });
router.post(
  "/admin/upload-kml",
  upload.single("file"),
  async (req, res, next) => {
    try {
      console.log("\n==== SWEEPING KML UPLOAD ====");

      const cityId = req.auth!.cityId!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

      if (!req.file) throw new HttpError(400, "KML required");

      console.log("City:", cityId);
      console.log("File:", req.file.originalname);

      const kml = fs.readFileSync(req.file.path, "utf8");
      const dom = new DOMParser().parseFromString(kml);
      const geo = toGeoJSON.kml(dom);

      console.log("GeoJSON features count:", geo.features.length);

      let created = 0;

      for (const f of geo.features) {
        if (!f.geometry) continue;

        const beatName = f.properties?.name || "Beat";

        console.log("\nProcessing:", beatName);

        // 🟢 Extract ward number
        const wardMatch = beatName.match(/(\d+)/);

        if (!wardMatch) {
          console.log("❌ Cannot detect ward from:", beatName);
          continue;
        }

        const wardNumber = wardMatch[1];

        console.log("Detected ward:", wardNumber);

        const wardNode = await prisma.geoNode.findFirst({
          where: {
            cityId,
            level: "WARD",
            name: { contains: wardNumber }
          }
        });

        if (!wardNode) {
          console.log("❌ Ward not found in DB:", wardNumber);
          continue;
        }

        console.log("Matched wardId:", wardNode.id);

        let lat = 0;
        let lng = 0;
        let coords: any[] = [];

        if (f.geometry.type === "Polygon") {
          const coords = f.geometry.coordinates[0];

          lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
          lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;
        }

        if (f.geometry.type === "MultiPolygon") {
          const coords = f.geometry.coordinates[0][0];

          lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
          lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;
        }

        console.log("CENTER:", lat, lng);


        lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
        lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;

        console.log("CENTER:", lat, lng);

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

        console.log("Saving beat with lat/lng:", lat, lng);

        await prisma.sweepingBeat.create({
          data: {
            cityId,
            geoNodeBeatId: beatNode.id,
            areaType: "RESIDENTIAL",
            latitude: lat,
            longitude: lng,
            radiusMeters: 10
          }
        });

        created++;
      }

      fs.unlinkSync(req.file.path);

      console.log("\nTOTAL CREATED BEATS:", created);

      res.json({ createdBeats: created });
    } catch (e) {
      next(e);
    }
  }
);


router.post(
  "/admin/assign-beat",
  validateBody(
    z.object({
      sweepingBeatId: z.string(),
      employeeId: z.string()
    })
  ),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC]);

      const beat = await prisma.sweepingBeat.findUnique({
        where: { id: req.body.sweepingBeatId }
      });

      if (!beat || beat.cityId !== cityId) {
        throw new HttpError(404, "Beat not found");
      }

      const updated = await prisma.sweepingBeat.update({
        where: { id: beat.id },
        data: {
          assignedEmployeeId: req.body.employeeId,
          assignedAt: new Date()
        }
      });

      res.json({ beat: updated });
    } catch (e) {
      next(e);
    }
  }
);



/* =========================================================
EMPLOYEE — GET ASSIGNED BEATS
========================================================= */

router.get("/employee/beats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

    const beats = await prisma.sweepingBeat.findMany({
      where: {
        cityId,
        assignedEmployeeId: userId,
        isActive: true
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        geoNodeBeat: true
      }
    });

    console.log("EMPLOYEE BEATS:", beats.length);

    res.json({ beats });
  } catch (e) {
    next(e);
  }
});


/* =========================================================
EMPLOYEE — SUBMIT INSPECTION
========================================================= */

router.post(
  "/inspections/submit",
  validateBody(
    z.object({
      sweepingBeatId: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      answers: z.array(
        z.object({
          questionCode: z.string(),
          answer: z.boolean(),
          photos: z.array(z.string())
        })
      )
    })
  ),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const userId = req.auth!.sub!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

      const beat = await prisma.sweepingBeat.findUnique({
        where: { id: req.body.sweepingBeatId }
      });

      if (!beat || beat.cityId !== cityId) throw new HttpError(404, "Beat not found");
      if (beat.assignedEmployeeId !== userId) throw new HttpError(403, "Not your beat");
      const distance = getDistanceMeters(
        req.body.latitude,
        req.body.longitude,
        beat.latitude,
        beat.longitude
      );

      if (distance > beat.radiusMeters) {
        throw new HttpError(403, `Outside beat area (${Math.round(distance)}m)`);
      }


      const inspection = await prisma.$transaction(async tx => {
        const ins = await tx.sweepingInspection.create({
          data: {
            cityId,
            sweepingBeatId: beat.id,
            employeeId: userId,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            inspectionDate: new Date(),
            status: "SUBMITTED"
          }
        });

        for (const a of req.body.answers) {
          const ans = await tx.sweepingInspectionAnswer.create({
            data: {
              inspectionId: ins.id,
              questionCode: a.questionCode,
              answer: a.answer
            }
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
    } catch (e) {
      next(e);
    }
  }
);

/* =========================================================
QC — LIST INSPECTIONS
========================================================= */

router.get("/qc/inspections", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId },
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

/* =========================================================
QC DECISION
========================================================= */

router.post(
  "/qc/inspections/:id/decision",
  validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"]) })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.QC]);

      const updated = await prisma.sweepingInspection.update({
        where: { id: req.params.id },
        data: {
          status: req.body.decision,
          qcReviewedById: req.auth!.sub!,
          qcReviewedAt: new Date()
        }
      });

      res.json({ inspection: updated });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/qc/beats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.QC]);


    console.log("QC BEATS FETCH city:", cityId);

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId },
      include: {
        geoNodeBeat: true,
        assignedEmployee: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    console.log("QC BEATS COUNT:", beats.length);

    res.json({ beats });

  } catch (e) {
    console.error("QC BEATS ERROR:", e);
    next(e);
  }
});



/* =========================================================
ACTION OFFICER
========================================================= */

router.get("/action/required", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "ACTION_REQUIRED" },
      include: { sweepingBeat: true }
    });

    res.json({ inspections });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/action/:inspectionId/respond",
  validateBody(z.object({ remarks: z.string(), photos: z.array(z.string()) })),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

      const r = await prisma.sweepingActionResponse.create({
        data: {
          cityId,
          inspectionId: req.params.inspectionId,
          actionOfficerId: req.auth!.sub!,
          remarks: req.body.remarks,
          submittedAt: new Date()
        }
      });

      await prisma.sweepingInspection.update({
        where: { id: req.params.inspectionId },
        data: { status: "ACTION_SUBMITTED" }
      });

      res.json({ actionResponse: r });
    } catch (e) {
      next(e);
    }
  }
);
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
