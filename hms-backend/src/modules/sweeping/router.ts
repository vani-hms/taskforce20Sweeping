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
import { getQcScope } from "../../utils/qcScope";


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

      console.log("FILES:", req.file);
      console.log("HEADERS:", req.headers["content-type"]);


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

        const wardMatch = beatName.match(/(\d+)/);

        if (!wardMatch) {
          console.log("❌ Cannot detect ward from:", beatName);
          continue;
        }

        const wardNumber = wardMatch[1];

        const wardNode = await prisma.geoNode.findFirst({
          where: {
            cityId,
            level: "WARD",
            name: { contains: wardNumber }
          }
        });

        if (!wardNode) {
          console.log("❌ Ward not found:", wardNumber);
          continue;
        }

        let coords: number[][] = [];

        if (f.geometry.type === "Polygon") {
          coords = f.geometry.coordinates[0];
        } else if (f.geometry.type === "MultiPolygon") {
          coords = f.geometry.coordinates[0][0];
        } else {
          console.log("❌ Unsupported geometry:", f.geometry.type);
          continue;
        }

        if (!coords.length) continue;

        const lat =
          coords.reduce((a, c) => a + c[1], 0) / coords.length;

        const lng =
          coords.reduce((a, c) => a + c[0], 0) / coords.length;

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
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "KML upload failed" });

    }
  }
);

// router.post(
//   "/admin/assign-beat",
//   validateBody(
//     z.object({
//       sweepingBeatId: z.string(),
//       employeeId: z.string()
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC]);

//       const beat = await prisma.sweepingBeat.findUnique({
//         where: { id: req.body.sweepingBeatId }
//       });

//       if (!beat || beat.cityId !== cityId) throw new HttpError(404, "Beat not found");

//       if (beat.assignmentStatus === "ACTIVE") {
//         throw new HttpError(400, "Beat already assigned");
//       }

//       const updated = await prisma.sweepingBeat.update({
//         where: { id: beat.id },
//         data: {
//           assignedEmployeeId: req.body.employeeId,
//           assignedAt: new Date(),
//           assignmentStatus: "ACTIVE"
//         }
//       });

//       res.json({ beat: updated });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

router.post(
  "/qc/assign-beat",
  validateBody(z.object({
    sweepingBeatId: z.string(),
    employeeId: z.string()
  })),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const qcId = req.auth!.sub!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.QC]);

      const beat = await prisma.sweepingBeat.findUnique({
        where: { id: req.body.sweepingBeatId },
        include: {
          geoNodeBeat: { include: { parent: true } }
        }
      });

      if (!beat || beat.cityId !== cityId)
        throw new HttpError(404, "Beat not found");

      if (beat.assignmentStatus === "ACTIVE")
        throw new HttpError(400, "Beat already assigned");

      // QC GEO SCOPE CHECK
      if (req.auth!.roles?.includes(Role.QC)) {
        const scope = await getQcScope({ userId: qcId, cityId, moduleId });

        const wardId = beat.geoNodeBeat.parentId;

        if (!scope.wardIds.includes(wardId!))
          throw new HttpError(403, "Beat outside QC ward");
      }

      const updated = await prisma.sweepingBeat.update({
        where: { id: beat.id },
        data: {
          assignedEmployeeId: req.body.employeeId,
          assignedQcId: qcId,
          assignedAt: new Date(),
          assignmentStatus: "ACTIVE"
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
        assignmentStatus: "ACTIVE"
      },
      include: {
        geoNodeBeat: true
      },
      orderBy: { assignedAt: "desc" }
    });

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
  validateBody(z.object({
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
  })),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const userId = req.auth!.sub!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

      const beat = await prisma.sweepingBeat.findUnique({
        where: { id: req.body.sweepingBeatId }
      });

      if (!beat || beat.cityId !== cityId)
        throw new HttpError(404, "Beat not found");

      if (beat.assignedEmployeeId !== userId)
        throw new HttpError(403, "Not your beat");

      // 🚫 BLOCK MULTIPLE SUBMIT
      const existing = await prisma.sweepingInspection.findFirst({
        where: {
          sweepingBeatId: beat.id,
          status: { notIn: ["REJECTED"] }
        }
      });

      if (existing)
        throw new HttpError(400, "Inspection already submitted");

      const inspection = await prisma.sweepingInspection.create({
        data: {
          cityId,
          sweepingBeatId: beat.id,
          employeeId: userId,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          inspectionDate: new Date(),
          status: "REVIEW_PENDING",
          currentOwnerRole: Role.QC
        }
      });

      for (const a of req.body.answers) {
        const ans = await prisma.sweepingInspectionAnswer.create({
          data: {
            inspectionId: inspection.id,
            questionCode: a.questionCode,
            answer: a.answer
          }
        });

        for (const p of a.photos) {
          await prisma.sweepingInspectionPhoto.create({
            data: {
              inspectionId: inspection.id,
              answerId: ans.id,
              photoUrl: p
            }
          });
        }
      }

      res.json({ inspection });
    } catch (e) {
      next(e);
    }
  }
);


// router.post(
//   "/inspections/submit",
//   validateBody(
//     z.object({
//       sweepingBeatId: z.string(),
//       latitude: z.number(),
//       longitude: z.number(),
//       answers: z.array(
//         z.object({
//           questionCode: z.string(),
//           answer: z.boolean(),
//           photos: z.array(z.string())
//         })
//       )
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const userId = req.auth!.sub!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

//       const beat = await prisma.sweepingBeat.findUnique({
//         where: { id: req.body.sweepingBeatId }
//       });

//       if (!beat || beat.cityId !== cityId)
//         throw new HttpError(404, "Beat not found");

//       if (beat.assignmentStatus !== "ACTIVE")
//         throw new HttpError(400, "Beat not active");

//       if (beat.assignedEmployeeId !== userId)
//         throw new HttpError(403, "Beat not assigned to you");

//       const existing = await prisma.sweepingInspection.findFirst({
//         where: {
//           sweepingBeatId: beat.id,
//           status: { notIn: ["REJECTED"] }
//         }
//       });

//       if (existing)
//         throw new HttpError(400, "Inspection already submitted for this beat");

//       const inspection = await prisma.$transaction(async tx => {
//         const ins = await tx.sweepingInspection.create({
//           data: {
//             cityId,
//             sweepingBeatId: beat.id,
//             employeeId: userId,
//             latitude: req.body.latitude,
//             longitude: req.body.longitude,
//             inspectionDate: new Date(),
//             status: "REVIEW_PENDING",
//             assignmentId: beat.id,
//             currentOwnerRole: Role.QC
//           }
//         });

//         for (const a of req.body.answers) {
//           const ans = await tx.sweepingInspectionAnswer.create({
//             data: {
//               inspectionId: ins.id,
//               questionCode: a.questionCode,
//               answer: a.answer
//             }
//           });

//           for (const p of a.photos) {
//             await tx.sweepingInspectionPhoto.create({
//               data: {
//                 inspectionId: ins.id,
//                 answerId: ans.id,
//                 photoUrl: p
//               }
//             });
//           }
//         }

//         return ins;
//       });

//       res.json({ inspection });
//     } catch (e) {
//       next(e);
//     }
//   }
// );


/* =========================================================
QC — LIST INSPECTIONS
========================================================= */

async function buildSweepingGeoFilter(userId: string, cityId: string, moduleId: string) {
  const scope = await getQcScope({ userId, cityId, moduleId });

  if (!scope.zoneIds.length && !scope.wardIds.length) return null;

  return {
    sweepingBeat: {
      geoNodeBeat: {
        parent: {
          OR: [
            ...(scope.wardIds.length ? [{ id: { in: scope.wardIds } }] : []),
            ...(scope.zoneIds.length ? [{ parentId: { in: scope.zoneIds } }] : [])
          ]
        }
      }
    }
  };
}


// router.get("/qc/inspections", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.QC]);

//     // --------------------
//     // QC GEO SCOPE
//     // --------------------
//     const scope = await getQcScope({ userId, cityId, moduleId });

//     if (!scope.zoneIds.length && !scope.wardIds.length) {
//       return res.json({
//         inspections: [],
//         stats: { pending: 0, approved: 0, rejected: 0, actionRequired: 0, total: 0 },
//         meta: { page: 1, limit: 20, total: 0, totalPages: 0 }
//       });
//     }

//     const geoFilter = {
//       sweepingBeat: {
//         geoNodeBeat: {
//           parent: {
//             OR: [
//               ...(scope.wardIds.length ? [{ id: { in: scope.wardIds } }] : []),
//               ...(scope.zoneIds.length
//                 ? [{ parentId: { in: scope.zoneIds } }]
//                 : [])
//             ]
//           }
//         }
//       }
//     };

//     // --------------------
//     // PAGINATION + TAB
//     // --------------------
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const skip = (page - 1) * limit;
//     const tab = (req.query.tab as string) || "PENDING";

//     let statusFilter: any = {};

//     if (tab === "PENDING") statusFilter.status = "REVIEW_PENDING";
//     if (tab === "APPROVED") statusFilter.status = "APPROVED";
//     if (tab === "REJECTED") statusFilter.status = "REJECTED";
//     if (tab === "ACTION_REQUIRED") statusFilter.status = "ACTION_REQUIRED";

//     const where = {
//       cityId,
//       ...statusFilter,
//       ...geoFilter
//     };

//     // --------------------
//     // DATA
//     // --------------------
//     const [total, inspections] = await Promise.all([
//       prisma.sweepingInspection.count({ where }),
//       prisma.sweepingInspection.findMany({
//         where,
//         skip,
//         take: limit,
//         orderBy: { createdAt: "desc" },
//         include: {
//           sweepingBeat: { include: { geoNodeBeat: true } },
//           employee: true,
//           answers: { include: { photos: true } },
//           photos: true
//         }
//       })
//     ]);

//     const enriched = inspections.map(i => ({
//       ...i,
//       photosFlat: [
//         ...(i.photos || []),
//         ...(i.answers || []).flatMap(a => a.photos || [])
//       ]
//     }));

//     // --------------------
//     // STATS
//     // --------------------
//     const [
//       statPending,
//       statApproved,
//       statRejected,
//       statAction,
//       statTotal
//     ] = await Promise.all([
//       prisma.sweepingInspection.count({ where: { cityId, status: "REVIEW_PENDING", ...geoFilter } }),
//       prisma.sweepingInspection.count({ where: { cityId, status: "APPROVED", ...geoFilter } }),
//       prisma.sweepingInspection.count({ where: { cityId, status: "REJECTED", ...geoFilter } }),
//       prisma.sweepingInspection.count({ where: { cityId, status: "ACTION_REQUIRED", ...geoFilter } }),
//       prisma.sweepingInspection.count({ where: { cityId, ...geoFilter } })
//     ]);

//     res.json({
//       inspections: enriched,
//       stats: {
//         pending: statPending,
//         approved: statApproved,
//         rejected: statRejected,
//         actionRequired: statAction,
//         total: statTotal
//       },
//       meta: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });
//   } catch (e) {
//     next(e);
//   }
// });
router.get("/qc/inspections", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const tab = (req.query.tab as string) || "PENDING";

    let status: any = "REVIEW_PENDING";
    if (tab === "APPROVED") status = "APPROVED";
    if (tab === "REJECTED") status = "REJECTED";
    if (tab === "ACTION_REQUIRED") status = "ACTION_REQUIRED";

    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId,
        status,
        sweepingBeat: {
          assignedQcId: qcId
        }
      },
      include: {
        sweepingBeat: { include: { geoNodeBeat: true } },
        employee: true,
        answers: { include: { photos: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ inspections });
  } catch (e) {
    next(e);
  }
});

// router.post(
//   "/qc/inspections/:id/decision",
//   validateBody(
//     z.object({
//       decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"])
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const userId = req.auth!.sub!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.QC]);

//       // Load inspection with full geo
//       const inspection = await prisma.sweepingInspection.findUnique({
//         where: { id: req.params.id },
//         include: {
//           sweepingBeat: {
//             include: {
//               geoNodeBeat: {
//                 include: {
//                   parent: { include: { parent: true } } // ward -> zone
//                 }
//               }
//             }
//           }
//         }
//       });

//       if (!inspection || inspection.cityId !== cityId)
//         throw new HttpError(404, "Inspection not found");

//       if (inspection.currentOwnerRole !== Role.QC)
//         throw new HttpError(400, "Inspection not pending QC");

//       const wardId = inspection.sweepingBeat.geoNodeBeat.parent?.id;
//       const zoneId = inspection.sweepingBeat.geoNodeBeat.parent?.parent?.id;

//       if (!wardId || !zoneId)
//         throw new HttpError(400, "Geo hierarchy broken");

//       // QC Scope check
//       const qcScope = await prisma.userModuleRole.findFirst({
//         where: {
//           cityId,
//           moduleId,
//           userId,
//           role: Role.QC
//         }
//       });

//       if (
//         !qcScope ||
//         (!qcScope.zoneIds?.includes(zoneId) &&
//           !qcScope.wardIds?.includes(wardId))
//       ) {
//         throw new HttpError(403, "Inspection outside QC scope");
//       }

//       const decision = req.body.decision;

//       let updateData: any = {
//         status: decision,
//         qcReviewedById: userId,
//         qcReviewedAt: new Date(),
//         currentOwnerRole: Role.QC
//       };

//       // ACTION REQUIRED → assign Action Officer
//       if (decision === "ACTION_REQUIRED") {
//         const ao = await prisma.userModuleRole.findFirst({
//           where: {
//             cityId,
//             moduleId,
//             role: Role.ACTION_OFFICER,
//             zoneIds: { has: zoneId }
//           }
//         });

//         if (!ao) throw new HttpError(400, "No Action Officer for this zone");

//         updateData.currentOwnerRole = Role.ACTION_OFFICER;
//         updateData.actionOfficerId = ao.userId;
//       }

//       const updated = await prisma.sweepingInspection.update({
//         where: { id: inspection.id },
//         data: updateData
//       });

//       // Beat lifecycle only on APPROVED
//       if (decision === "APPROVED") {
//         await prisma.sweepingBeat.update({
//           where: { id: inspection.sweepingBeatId },
//           data: {
//             assignmentStatus: "COMPLETED",
//             assignedEmployeeId: null
//           }
//         });
//       }

//       // Audit
//       await prisma.inspectionAudit.create({
//         data: {
//           inspectionId: inspection.id,
//           fromStatus: "REVIEW_PENDING",
//           toStatus: decision,
//           actorId: userId
//         }
//       });

//       res.json({ inspection: updated });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

router.post(
  "/qc/inspections/:id/decision",
  validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"]) })),
  async (req, res, next) => {
    try {
      const cityId = req.auth!.cityId!;
      const userId = req.auth!.sub!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.QC]);

      const inspection = await prisma.sweepingInspection.findUnique({
        where: { id: req.params.id }
      });

      if (!inspection || inspection.cityId !== cityId)
        throw new HttpError(404, "Inspection not found");

      const updated = await prisma.sweepingInspection.update({
        where: { id: inspection.id },
        data: {
          status: req.body.decision,
          qcReviewedById: userId,
          qcReviewedAt: new Date()
        }
      });

      if (req.body.decision === "APPROVED") {
        await prisma.sweepingBeat.update({
          where: { id: inspection.sweepingBeatId },
          data: {
            assignmentStatus: "COMPLETED",
            assignedEmployeeId: null
          }
        });
      }

      res.json({ inspection: updated });
    } catch (e) {
      next(e);
    }
  }
);


// router.get("/qc/beats", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.QC]);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);
//     if (!geoFilter) return res.json({ beats: [] });

//     const beats = await prisma.sweepingBeat.findMany({
//       where: {
//         cityId,
//         geoNodeBeat: geoFilter.sweepingBeat.geoNodeBeat
//       },
//       include: {
//         geoNodeBeat: true,
//         assignedEmployee: {
//           select: { id: true, name: true, email: true }
//         }
//       },
//       orderBy: { createdAt: "desc" }
//     });

//     res.json({ beats });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/qc/beats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const qcId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.QC]);

    const beats = await prisma.sweepingBeat.findMany({
      where: {
        cityId,
        assignedQcId: qcId
      },
      include: {
        geoNodeBeat: true,
        assignedEmployee: true
      }
    });

    res.json({ beats });
  } catch (e) {
    next(e);
  }
});



router.post(
  "/qc/action-review/:id",
  validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED"]) })),
  async (req, res, next) => {
    try {
      const moduleId = await getModuleIdByName(MODULE_KEY);
      await assertModuleAccess(req, res, moduleId, [Role.QC]);

      const inspection = await prisma.sweepingInspection.update({
        where: { id: req.params.id },
        data: {
          status: req.body.decision,
          qcReviewedById: req.auth!.sub!,
          qcReviewedAt: new Date()
        }
      });

      // ✅ complete beat
      if (req.body.decision === "APPROVED") {
        await prisma.sweepingBeat.update({
          where: { id: inspection.sweepingBeatId },
          data: {
            assignmentStatus: "COMPLETED",
            assignedEmployeeId: null
          }
        });
      }

      // audit
      await prisma.inspectionAudit.create({
        data: {
          inspectionId: inspection.id,
          fromStatus: "ACTION_SUBMITTED",
          toStatus: req.body.decision,
          actorId: req.auth!.sub!
        }
      });

      res.json({ inspection });
    } catch (e) {
      next(e);
    }
  }
);


/* =========================================================
ACTION OFFICER
========================================================= */

// router.get("/action/required", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

//     const aoRole = await prisma.userModuleRole.findFirst({
//       where: {
//         cityId,
//         moduleId,
//         userId,
//         role: Role.ACTION_OFFICER
//       }
//     });

//     if (!aoRole || !aoRole.zoneIds?.length)
//       return res.json({ inspections: [] });

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId,
//         status: "ACTION_REQUIRED",
//         currentOwnerRole: Role.ACTION_OFFICER,
//         actionOfficerId: userId,
//         sweepingBeat: {
//           geoNodeBeat: {
//             parent: {
//               parentId: { in: aoRole.zoneIds }
//             }
//           }
//         }
//       },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       },
//       orderBy: { createdAt: "desc" }
//     });

//     res.json({ inspections });
//   } catch (e) {
//     next(e);
//   }

router.get("/action/required", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const userId = req.auth!.sub!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

    const inspections = await prisma.sweepingInspection.findMany({
      where: {
        cityId,
        status: "ACTION_REQUIRED",
        currentOwnerRole: Role.ACTION_OFFICER,
        actionOfficerId: userId
      },
      include: {
        sweepingBeat: { include: { geoNodeBeat: true } }
      },
      orderBy: { createdAt: "desc" }
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
      const userId = req.auth!.sub!;
      const moduleId = await getModuleIdByName(MODULE_KEY);

      await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

      const inspection = await prisma.sweepingInspection.findUnique({
        where: { id: req.params.inspectionId }
      });

      if (!inspection || inspection.cityId !== cityId)
        throw new HttpError(404, "Inspection not found");

      if (inspection.currentOwnerRole !== Role.ACTION_OFFICER)
        throw new HttpError(400, "Inspection not pending Action Officer");

      if (inspection.actionOfficerId !== userId)
        throw new HttpError(403, "Not assigned Action Officer");

      const response = await prisma.sweepingActionResponse.upsert({
        where: { inspectionId: inspection.id },
        update: {
          remarks: req.body.remarks,
          submittedAt: new Date()
        },
        create: {
          cityId,
          inspectionId: inspection.id,
          actionOfficerId: userId,
          remarks: req.body.remarks,
          submittedAt: new Date()
        }
      });

      await prisma.sweepingInspection.update({
        where: { id: inspection.id },
        data: {
          status: "ACTION_SUBMITTED",
          currentOwnerRole: Role.QC
        }
      });

      await prisma.inspectionAudit.create({
        data: {
          inspectionId: inspection.id,
          fromStatus: "ACTION_REQUIRED",
          toStatus: "ACTION_SUBMITTED",
          actorId: userId
        }
      });

      res.json({ actionResponse: response });
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

//=================== Dashboard =================================

// router.get("/dashboard/summary", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER,
//       Role.QC
//     ]);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);

//     const [
//       totalBeats,
//       activeBeats,
//       pendingQc,
//       actionRequired,
//       approvedToday
//     ] = await Promise.all([
//       prisma.sweepingBeat.count({ where: { cityId, ...(geoFilter || {}) } }),
//       prisma.sweepingBeat.count({ where: { cityId, assignmentStatus: "ACTIVE", ...(geoFilter || {}) } }),
//       prisma.sweepingInspection.count({ where: { cityId, status: "REVIEW_PENDING", ...(geoFilter || {}) } }),
//       prisma.sweepingInspection.count({ where: { cityId, status: "ACTION_REQUIRED", ...(geoFilter || {}) } }),
//       prisma.sweepingInspection.count({
//         where: {
//           cityId,
//           status: "APPROVED",
//           createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
//           ...(geoFilter || {})
//         }
//       })
//     ]);

//     res.json({ totalBeats, activeBeats, pendingQc, actionRequired, approvedToday });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/summary", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [
      Role.CITY_ADMIN,
      Role.COMMISSIONER,
      Role.QC
    ]);

    const [
      totalBeats,
      activeBeats,
      pendingQc,
      actionRequired,
      approvedToday
    ] = await Promise.all([
      prisma.sweepingBeat.count({ where: { cityId } }),
      prisma.sweepingBeat.count({ where: { cityId, assignmentStatus: "ACTIVE" } }),
      prisma.sweepingInspection.count({ where: { cityId, status: "REVIEW_PENDING" } }),
      prisma.sweepingInspection.count({ where: { cityId, status: "ACTION_REQUIRED" } }),
      prisma.sweepingInspection.count({
        where: {
          cityId,
          status: "APPROVED",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })
    ]);

    res.json({ totalBeats, activeBeats, pendingQc, actionRequired, approvedToday });
  } catch (e) {
    next(e);
  }
});


// router.get("/dashboard/qc-load", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER,
//       Role.QC
//     ]);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);

//     const data = await prisma.sweepingInspection.groupBy({
//       by: ["qcReviewedById"],
//       where: {
//         cityId,
//         status: "REVIEW_PENDING",
//         ...(geoFilter || {})
//       },
//       _count: true
//     });

//     res.json({ qcLoad: data });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/qc-load", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const data = await prisma.sweepingInspection.groupBy({
      by: ["qcReviewedById"],
      where: { cityId, status: "REVIEW_PENDING" },
      _count: true
    });

    res.json({ qcLoad: data });
  } catch (e) {
    next(e);
  }
});


// router.get("/dashboard/ward-ranking", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: { cityId, status: "APPROVED" },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const wardMap: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       wardMap[ward] = (wardMap[ward] || 0) + 1;
//     });

//     res.json({ wardRanking: wardMap });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/ward-ranking", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "APPROVED" },
      include: { sweepingBeat: { include: { geoNodeBeat: true } } }
    });

    const map: Record<string, number> = {};

    inspections.forEach(i => {
      const ward = i.sweepingBeat.geoNodeBeat.parentId;
      if (ward) map[ward] = (map[ward] || 0) + 1;
    });

    res.json({ wardRanking: map });
  } catch (e) {
    next(e);
  }
});


// router.get("/dashboard/beat-progress", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const total = await prisma.sweepingBeat.count({ where: { cityId } });

//     const active = await prisma.sweepingBeat.count({
//       where: { cityId, assignmentStatus: "ACTIVE" }
//     });

//     const completed = await prisma.sweepingBeat.count({
//       where: { cityId, assignmentStatus: "COMPLETED" }
//     });

//     res.json({
//       total,
//       active,
//       completed,
//       notStarted: total - active - completed
//     });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/beat-progress", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const total = await prisma.sweepingBeat.count({ where: { cityId } });
    const active = await prisma.sweepingBeat.count({ where: { cityId, assignmentStatus: "ACTIVE" } });
    const completed = await prisma.sweepingBeat.count({ where: { cityId, assignmentStatus: "COMPLETED" } });

    res.json({
      total,
      active,
      completed,
      notStarted: total - active - completed
    });
  } catch (e) {
    next(e);
  }
});


router.get("/dashboard/evidence-today", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const count = await prisma.sweepingInspectionPhoto.count({
      where: {
        inspection: {
          cityId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }
    });

    res.json({ photosToday: count });
  } catch (e) {
    next(e);
  }
});

router.get("/dashboard/map-beats", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleId = await getModuleIdByName(MODULE_KEY);

    await assertModuleAccess(req, res, moduleId, [
      Role.CITY_ADMIN,
      Role.COMMISSIONER
    ]);

    const beats = await prisma.sweepingBeat.findMany({
      where: { cityId },
      include: {
        inspections: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        geoNodeBeat: true
      }
    });

    const mapped = beats.map(b => ({
      id: b.id,
      lat: b.latitude,
      lng: b.longitude,
      name: b.geoNodeBeat.name,
      status: b.inspections[0]?.status || "NOT_STARTED"
    }));

    res.json({ beats: mapped });
  } catch (e) {
    next(e);
  }
});

// router.get("/dashboard/zone-heatmap", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId,
//         status: "APPROVED",
//         ...(geoFilter || {})
//       },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const map: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       map[ward] = (map[ward] || 0) + 1;
//     });

//     res.json({ zones: map });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/zone-heatmap", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "APPROVED" },
      include: { sweepingBeat: { include: { geoNodeBeat: true } } }
    });

    const map: Record<string, number> = {};

    inspections.forEach(i => {
      const ward = i.sweepingBeat.geoNodeBeat.parentId;
      if (ward) map[ward] = (map[ward] || 0) + 1;
    });

    res.json({ zones: map });
  } catch (e) {
    next(e);
  }
});



router.get("/dashboard/employee-tracking", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const data = await prisma.sweepingInspection.findMany({
      where: { cityId },
      distinct: ["employeeId"],
      orderBy: { createdAt: "desc" },
      include: { employee: true }
    });

    res.json({
      employees: data.map(d => ({
        id: d.employeeId,
        name: d.employee.name,
        lat: d.latitude,
        lng: d.longitude,
        at: d.createdAt
      }))
    });
  } catch (e) {
    next(e);
  }
});

router.get("/dashboard/qc-sla", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const pending = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "REVIEW_PENDING" }
    });

    const now = Date.now();

    const enriched = pending.map(p => ({
      id: p.id,
      minutes: Math.floor((now - new Date(p.createdAt).getTime()) / 60000)
    }));

    res.json({ pending: enriched });
  } catch (e) {
    next(e);
  }
});

// router.get("/dashboard/ward-leaderboard", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId,
//         status: "APPROVED",
//         ...(geoFilter || {})
//       },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const map: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       map[ward] = (map[ward] || 0) + 1;
//     });

//     const sorted = Object.entries(map)
//       .sort((a, b) => b[1] - a[1])
//       .map(([wardId, count]) => ({ wardId, count }));

//     res.json({ leaderboard: sorted });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/ward-leaderboard", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "APPROVED" },
      include: { sweepingBeat: { include: { geoNodeBeat: true } } }
    });

    const map: Record<string, number> = {};

    inspections.forEach(i => {
      const ward = i.sweepingBeat.geoNodeBeat.parentId;
      if (ward) map[ward] = (map[ward] || 0) + 1;
    });

    const leaderboard = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([wardId, count]) => ({ wardId, count }));

    res.json({ leaderboard });
  } catch (e) {
    next(e);
  }
});


// router.get("/dashboard/zone-polygons", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     const geoFilter = await buildSweepingGeoFilter(userId, cityId, moduleId);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId,
//         status: "APPROVED",
//         ...(geoFilter || {})
//       },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const wardScore: Record<string, number> = {};

//     inspections.forEach(i => {
//       const wardId = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!wardId) return;
//       wardScore[wardId] = (wardScore[wardId] || 0) + 1;
//     });

//     const wards = await prisma.geoNode.findMany({
//       where: { cityId, level: "WARD" }
//     });

//     const payload = wards.map(w => ({
//       id: w.id,
//       name: w.name,
//       path: w.path,
//       score: wardScore[w.id] || 0
//     }));

//     res.json({ zones: payload });
//   } catch (e) {
//     next(e);
//   }
// });

router.get("/dashboard/zone-polygons", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;

    const inspections = await prisma.sweepingInspection.findMany({
      where: { cityId, status: "APPROVED" },
      include: { sweepingBeat: { include: { geoNodeBeat: true } } }
    });

    const score: Record<string, number> = {};

    inspections.forEach(i => {
      const ward = i.sweepingBeat.geoNodeBeat.parentId;
      if (ward) score[ward] = (score[ward] || 0) + 1;
    });

    const wards = await prisma.geoNode.findMany({
      where: { cityId, level: "WARD" }
    });

    res.json({
      zones: wards.map(w => ({
        id: w.id,
        name: w.name,
        path: w.path,
        score: score[w.id] || 0
      }))
    });
  } catch (e) {
    next(e);
  }
});


export default router;


//=============================old code ==============================================


// import { Router } from "express";
// import { z } from "zod";
// import { prisma } from "../../prisma";
// import { authenticate } from "../../middleware/auth";
// import { requireCityContext, assertModuleAccess } from "../../middleware/rbac";
// import { Role } from "../../../generated/prisma";
// import { validateBody } from "../../utils/validation";
// import { HttpError } from "../../utils/errors";
// import { getModuleIdByName } from "../moduleRegistry";
// import multer from "multer";
// import fs from "fs";
// import { DOMParser } from "@xmldom/xmldom";
// import toGeoJSON from "@tmcw/togeojson";


// const router = Router();
// router.use(authenticate, requireCityContext());
// function buildScopeFilters(scope: { zoneIds: string[]; wardIds: string[] }) {
//   const zoneFilter =
//     scope.zoneIds.length === 0
//       ? undefined
//       : {
//         OR: [{ zoneId: { in: scope.zoneIds } }, { zoneId: null }]
//       };
//   const wardFilter =
//     scope.wardIds.length === 0
//       ? undefined
//       : {
//         OR: [{ wardId: { in: scope.wardIds } }, { wardId: null }]
//       };
//   return { zoneFilter, wardFilter };
// }


// const MODULE_KEY = "SWEEPING";

// const upload = multer({ dest: "uploads/" });
// // router.post(
// //   "/admin/upload-kml",
// //   upload.single("file"),
// //   async (req, res, next) => {
// //     try {
// //       console.log("\n==== SWEEPING KML UPLOAD ====");

// //       const cityId = req.auth!.cityId!;
// //       const moduleId = await getModuleIdByName(MODULE_KEY);

// //       await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

// //       if (!req.file) throw new HttpError(400, "KML required");

// //       console.log("City:", cityId);
// //       console.log("File:", req.file.originalname);

// //       const kml = fs.readFileSync(req.file.path, "utf8");
// //       const dom = new DOMParser().parseFromString(kml);
// //       const geo = toGeoJSON.kml(dom);

// //       console.log("GeoJSON features count:", geo.features.length);

// //       let created = 0;

// //       for (const f of geo.features) {
// //         if (!f.geometry) continue;

// //         const beatName = f.properties?.name || "Beat";

// //         console.log("\nProcessing:", beatName);

// //         // 🟢 Extract ward number
// //         const wardMatch = beatName.match(/(\d+)/);

// //         if (!wardMatch) {
// //           console.log("❌ Cannot detect ward from:", beatName);
// //           continue;
// //         }

// //         const wardNumber = wardMatch[1];

// //         console.log("Detected ward:", wardNumber);

// //         const wardNode = await prisma.geoNode.findFirst({
// //           where: {
// //             cityId,
// //             level: "WARD",
// //             name: { contains: wardNumber }
// //           }
// //         });

// //         if (!wardNode) {
// //           console.log("❌ Ward not found in DB:", wardNumber);
// //           continue;
// //         }

// //         console.log("Matched wardId:", wardNode.id);

// //         let lat = 0;
// //         let lng = 0;
// //         let coords: any[] = [];

// //         if (f.geometry.type === "Polygon") {
// //           const coords = f.geometry.coordinates[0];

// //           lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
// //           lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;
// //         }

// //         if (f.geometry.type === "MultiPolygon") {
// //           const coords = f.geometry.coordinates[0][0];

// //           lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
// //           lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;
// //         }

// //         console.log("CENTER:", lat, lng);


// //         lat = coords.reduce((a: number, c: number[]) => a + c[1], 0) / coords.length;
// //         lng = coords.reduce((a: number, c: number[]) => a + c[0], 0) / coords.length;

// //         console.log("CENTER:", lat, lng);

// //         const beatNode = await prisma.geoNode.create({
// //           data: {
// //             cityId,
// //             parentId: wardNode.id,
// //             level: "BEAT",
// //             name: beatName,
// //             path: `BEAT_${Date.now()}`,
// //             areaType: "RESIDENTIAL"
// //           }
// //         });

// //         console.log("Saving beat with lat/lng:", lat, lng);

// //         await prisma.sweepingBeat.create({
// //           data: {
// //             cityId,
// //             geoNodeBeatId: beatNode.id,
// //             areaType: "RESIDENTIAL",
// //             latitude: lat,
// //             longitude: lng,
// //             radiusMeters: 10
// //           }
// //         });

// //         created++;
// //       }

// //       fs.unlinkSync(req.file.path);

// //       console.log("\nTOTAL CREATED BEATS:", created);

// //       res.json({ createdBeats: created });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// router.post(
//   "/admin/upload-kml",
//   upload.single("file"),
//   async (req, res, next) => {
//     try {
//       console.log("\n==== SWEEPING KML UPLOAD ====");

//       const cityId = req.auth!.cityId!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN]);

//       console.log("FILES:", req.file);
//       console.log("HEADERS:", req.headers["content-type"]);


//       if (!req.file) throw new HttpError(400, "KML required");

//       console.log("City:", cityId);
//       console.log("File:", req.file.originalname);

//       const kml = fs.readFileSync(req.file.path, "utf8");
//       const dom = new DOMParser().parseFromString(kml);
//       const geo = toGeoJSON.kml(dom);

//       console.log("GeoJSON features count:", geo.features.length);

//       let created = 0;

//       for (const f of geo.features) {
//         if (!f.geometry) continue;

//         const beatName = f.properties?.name || "Beat";

//         console.log("\nProcessing:", beatName);

//         const wardMatch = beatName.match(/(\d+)/);

//         if (!wardMatch) {
//           console.log("❌ Cannot detect ward from:", beatName);
//           continue;
//         }

//         const wardNumber = wardMatch[1];

//         const wardNode = await prisma.geoNode.findFirst({
//           where: {
//             cityId,
//             level: "WARD",
//             name: { contains: wardNumber }
//           }
//         });

//         if (!wardNode) {
//           console.log("❌ Ward not found:", wardNumber);
//           continue;
//         }

//         let coords: number[][] = [];

//         if (f.geometry.type === "Polygon") {
//           coords = f.geometry.coordinates[0];
//         } else if (f.geometry.type === "MultiPolygon") {
//           coords = f.geometry.coordinates[0][0];
//         } else {
//           console.log("❌ Unsupported geometry:", f.geometry.type);
//           continue;
//         }

//         if (!coords.length) continue;

//         const lat =
//           coords.reduce((a, c) => a + c[1], 0) / coords.length;

//         const lng =
//           coords.reduce((a, c) => a + c[0], 0) / coords.length;

//         console.log("CENTER:", lat, lng);

//         const beatNode = await prisma.geoNode.create({
//           data: {
//             cityId,
//             parentId: wardNode.id,
//             level: "BEAT",
//             name: beatName,
//             path: `BEAT_${Date.now()}`,
//             areaType: "RESIDENTIAL"
//           }
//         });

//         await prisma.sweepingBeat.create({
//           data: {
//             cityId,
//             geoNodeBeatId: beatNode.id,
//             areaType: "RESIDENTIAL",
//             latitude: lat,
//             longitude: lng,
//             radiusMeters: 10
//           }
//         });

//         created++;
//       }

//       fs.unlinkSync(req.file.path);

//       console.log("\nTOTAL CREATED BEATS:", created);

//       res.json({ createdBeats: created });
//     } catch (e: any) {
//       console.error(e);
//       res.status(500).json({ error: e.message || "KML upload failed" });

//     }
//   }
// );


// // router.post(
// //   "/admin/assign-beat",
// //   validateBody(
// //     z.object({
// //       sweepingBeatId: z.string(),
// //       employeeId: z.string()
// //     })
// //   ),
// //   async (req, res, next) => {
// //     try {
// //       const cityId = req.auth!.cityId!;
// //       const moduleId = await getModuleIdByName(MODULE_KEY);

// //       await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC]);

// //       const beat = await prisma.sweepingBeat.findUnique({
// //         where: { id: req.body.sweepingBeatId }
// //       });

// //       if (!beat || beat.cityId !== cityId) {
// //         throw new HttpError(404, "Beat not found");
// //       }

// //       const updated = await prisma.sweepingBeat.update({
// //         where: { id: beat.id },
// //         data: {
// //           assignedEmployeeId: req.body.employeeId,
// //           assignedAt: new Date()
// //         }
// //       });

// //       res.json({ beat: updated });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// router.post(
//   "/admin/assign-beat",
//   validateBody(
//     z.object({
//       sweepingBeatId: z.string(),
//       employeeId: z.string()
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.CITY_ADMIN, Role.QC]);

//       const beat = await prisma.sweepingBeat.findUnique({
//         where: { id: req.body.sweepingBeatId }
//       });

//       if (!beat || beat.cityId !== cityId) throw new HttpError(404, "Beat not found");

//       if (beat.assignmentStatus === "ACTIVE") {
//         throw new HttpError(400, "Beat already assigned");
//       }

//       const updated = await prisma.sweepingBeat.update({
//         where: { id: beat.id },
//         data: {
//           assignedEmployeeId: req.body.employeeId,
//           assignedAt: new Date(),
//           assignmentStatus: "ACTIVE"
//         }
//       });

//       res.json({ beat: updated });
//     } catch (e) {
//       next(e);
//     }
//   }
// );


// /* =========================================================
// EMPLOYEE — GET ASSIGNED BEATS
// ========================================================= */
// router.get("/employee/beats", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const userId = req.auth!.sub!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

//     const beats = await prisma.sweepingBeat.findMany({
//       where: {
//         cityId,
//         assignedEmployeeId: userId,
//         assignmentStatus: "ACTIVE"
//       },
//       include: { geoNodeBeat: true }
//     });

//     res.json({ beats });
//   } catch (e) {
//     next(e);
//   }
// });




// /* =========================================================
// EMPLOYEE — SUBMIT INSPECTION
// ========================================================= */

// router.post(
//   "/inspections/submit",
//   validateBody(
//     z.object({
//       sweepingBeatId: z.string(),
//       latitude: z.number(),
//       longitude: z.number(),
//       answers: z.array(
//         z.object({
//           questionCode: z.string(),
//           answer: z.boolean(),
//           photos: z.array(z.string())
//         })
//       )
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const userId = req.auth!.sub!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.EMPLOYEE]);

//       const beat = await prisma.sweepingBeat.findUnique({
//         where: { id: req.body.sweepingBeatId }
//       });

//       if (!beat || beat.cityId !== cityId) throw new HttpError(404, "Beat not found");
//       if (beat.assignedEmployeeId !== userId) throw new HttpError(403, "Not your beat");
//       // 🚧 GEO FENCING DISABLED FOR TESTING
//       // const distance = getDistanceMeters(
//       //   req.body.latitude,
//       //   req.body.longitude,
//       //   beat.latitude,
//       //   beat.longitude
//       // );

//       // if (distance > beat.radiusMeters) {
//       //   throw new HttpError(403, `Outside beat area (${Math.round(distance)}m)`);
//       // }


//       const inspection = await prisma.$transaction(async tx => {
//         const ins = await tx.sweepingInspection.create({
//           data: {
//             cityId,
//             sweepingBeatId: beat.id,
//             employeeId: userId,
//             latitude: req.body.latitude,
//             longitude: req.body.longitude,
//             inspectionDate: new Date(),
//             status: "REVIEW_PENDING",
//             assignmentId: beat.id
//           }
//         });

//         for (const a of req.body.answers) {
//           const ans = await tx.sweepingInspectionAnswer.create({
//             data: {
//               inspectionId: ins.id,
//               questionCode: a.questionCode,
//               answer: a.answer
//             }
//           });

//           for (const p of a.photos) {
//             await tx.sweepingInspectionPhoto.create({
//               data: { inspectionId: ins.id, answerId: ans.id, photoUrl: p }
//             });
//           }
//         }

//         return ins;
//       });

//       res.json({ inspection });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// /* =========================================================
// QC — LIST INSPECTIONS
// ========================================================= */

// router.get("/qc/inspections", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.QC]);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: { cityId },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } },
//         employee: true,
//         answers: {
//           include: {
//             photos: true
//           }
//         },
//         photos: true
//       },
//       orderBy: { createdAt: "desc" }
//     });

//     // 🔥 flatten answer photos + inspection photos
//     const enriched = inspections.map(i => ({
//       ...i,
//       photosFlat: [
//         ...(i.photos || []),
//         ...(i.answers || []).flatMap(a => a.photos || [])
//       ]
//     }));

//     res.json({ inspections: enriched });

//   } catch (e) {
//     next(e);
//   }
// });


// // router.get("/qc/inspections", async (req, res, next) => {
// //   try {
// //     const cityId = req.auth!.cityId!;
// //     const moduleId = await getModuleIdByName(MODULE_KEY);

// //     await assertModuleAccess(req, res, moduleId, [Role.QC]);

// //     const inspections = await prisma.sweepingInspection.findMany({
// //       where: { cityId },
// //       include: {
// //         sweepingBeat: { include: { geoNodeBeat: true } },
// //         employee: true,
// //         answers: true,
// //         photos: true
// //       },
// //       orderBy: { createdAt: "desc" }
// //     });

// //     res.json({ inspections });
// //   } catch (e) {
// //     next(e);
// //   }
// // });

// /* =========================================================
// QC DECISION
// ========================================================= */

// // router.post(
// //   "/qc/inspections/:id/decision",
// //   validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"]) })),
// //   async (req, res, next) => {
// //     try {
// //       const moduleId = await getModuleIdByName(MODULE_KEY);
// //       await assertModuleAccess(req, res, moduleId, [Role.QC]);

// //       const updated = await prisma.sweepingInspection.update({
// //         where: { id: req.params.id },
// //         data: {
// //           status: req.body.decision,
// //           qcReviewedById: req.auth!.sub!,
// //           qcReviewedAt: new Date()
// //         }
// //       });

// //       res.json({ inspection: updated });
// //     } catch (e) {
// //       next(e);
// //     }
// //   }
// // );

// router.post(
//   "/qc/inspections/:id/decision",
//   validateBody(
//     z.object({
//       decision: z.enum(["APPROVED", "REJECTED", "ACTION_REQUIRED"]),
//       actionOfficerId: z.string().optional()
//     })
//   ),
//   async (req, res, next) => {
//     try {
//       const moduleId = await getModuleIdByName(MODULE_KEY);
//       await assertModuleAccess(req, res, moduleId, [Role.QC]);

//       const data: any = {
//         status: req.body.decision,
//         qcReviewedById: req.auth!.sub!,
//         qcReviewedAt: new Date()
//       };

//       if (req.body.decision === "ACTION_REQUIRED") {

//         const inspectionFull = await prisma.sweepingInspection.findUnique({
//           where: { id: req.params.id },
//           include: {
//             sweepingBeat: {
//               include: {
//                 geoNodeBeat: {
//                   include: {
//                     parent: {
//                       include: {
//                         parent: true
//                       }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         });

//         if (!inspectionFull)
//           throw new HttpError(404, "Inspection not found");

//         const zoneId =
//           inspectionFull.sweepingBeat.geoNodeBeat.parent?.parent?.id;

//         if (!zoneId)
//           throw new HttpError(400, "Zone not resolved");

//         // 🔥 find ACTION_OFFICER from UserModuleRole using zoneIds
//         const officerRole = await prisma.userModuleRole.findFirst({
//           where: {
//             cityId: req.auth!.cityId!,
//             moduleId,
//             role: Role.ACTION_OFFICER,
//             zoneIds: {
//               has: zoneId
//             }
//           },
//           include: {
//             user: true
//           }
//         });

//         if (!officerRole)
//           throw new HttpError(400, "No Action Officer in this zone");

//         data.currentOwnerRole = Role.ACTION_OFFICER;
//         data.actionOfficerId = officerRole.user.id;
//       }


//       const inspection = await prisma.sweepingInspection.update({
//         where: { id: req.params.id },
//         data
//       });

//       if (req.body.decision !== "ACTION_REQUIRED") {
//         await prisma.sweepingBeat.update({
//           where: { id: inspection.sweepingBeatId },
//           data: {
//             assignmentStatus: "COMPLETED",
//             assignedEmployeeId: null
//           }
//         });
//       }

//       await prisma.inspectionAudit.create({
//         data: {
//           inspectionId: req.params.id,
//           fromStatus: "REVIEW_PENDING",
//           toStatus: req.body.decision,
//           actorId: req.auth!.sub!
//         }
//       });

//       res.json({ inspection });
//     } catch (e) {
//       next(e);
//     }
//   }
// );


// router.get("/qc/beats", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.QC]);


//     console.log("QC BEATS FETCH city:", cityId);

//     const beats = await prisma.sweepingBeat.findMany({
//       where: { cityId },
//       include: {
//         geoNodeBeat: true,
//         assignedEmployee: {
//           select: { id: true, name: true, email: true }
//         }
//       },
//       orderBy: { createdAt: "desc" }
//     });

//     console.log("QC BEATS COUNT:", beats.length);

//     res.json({ beats });

//   } catch (e) {
//     console.error("QC BEATS ERROR:", e);
//     next(e);
//   }
// });

// router.post(
//   "/qc/action-review/:id",
//   validateBody(z.object({ decision: z.enum(["APPROVED", "REJECTED"]) })),
//   async (req, res, next) => {
//     try {
//       const moduleId = await getModuleIdByName(MODULE_KEY);
//       await assertModuleAccess(req, res, moduleId, [Role.QC]);

//       const inspection = await prisma.sweepingInspection.update({
//         where: { id: req.params.id },
//         data: {
//           status: req.body.decision,
//           qcReviewedById: req.auth!.sub!,
//           qcReviewedAt: new Date()
//         }
//       });

//       // ✅ complete beat
//       if (req.body.decision === "APPROVED") {
//         await prisma.sweepingBeat.update({
//           where: { id: inspection.sweepingBeatId },
//           data: {
//             assignmentStatus: "COMPLETED",
//             assignedEmployeeId: null
//           }
//         });
//       }

//       // audit
//       await prisma.inspectionAudit.create({
//         data: {
//           inspectionId: inspection.id,
//           fromStatus: "ACTION_SUBMITTED",
//           toStatus: req.body.decision,
//           actorId: req.auth!.sub!
//         }
//       });

//       res.json({ inspection });
//     } catch (e) {
//       next(e);
//     }
//   }
// );


// /* =========================================================
// ACTION OFFICER
// ========================================================= */
// router.get("/action/required", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: {
//         cityId,
//         status: "ACTION_REQUIRED",
//         actionOfficerId: req.auth!.sub!
//       },
//       include: { sweepingBeat: true }
//     });

//     res.json({ inspections });
//   } catch (e) {
//     next(e);
//   }
// });


// router.post(
//   "/action/:inspectionId/respond",
//   validateBody(z.object({ remarks: z.string(), photos: z.array(z.string()) })),
//   async (req, res, next) => {
//     try {
//       const cityId = req.auth!.cityId!;
//       const moduleId = await getModuleIdByName(MODULE_KEY);

//       await assertModuleAccess(req, res, moduleId, [Role.ACTION_OFFICER]);

//       const r = await prisma.sweepingActionResponse.upsert({
//         where: { inspectionId: req.params.inspectionId },
//         update: {
//           remarks: req.body.remarks,
//           submittedAt: new Date()
//         },
//         create: {
//           cityId,
//           inspectionId: req.params.inspectionId,
//           actionOfficerId: req.auth!.sub!,
//           remarks: req.body.remarks,
//           submittedAt: new Date()
//         }
//       });

//       await prisma.sweepingInspection.update({
//         where: { id: req.params.inspectionId },
//         data: {
//           status: "ACTION_SUBMITTED",
//           currentOwnerRole: Role.QC
//         }

//       });

//       // ✅ Audit here (correct place)
//       await prisma.inspectionAudit.create({
//         data: {
//           inspectionId: req.params.inspectionId,
//           fromStatus: "ACTION_REQUIRED",
//           toStatus: "ACTION_SUBMITTED",
//           actorId: req.auth!.sub!
//         }
//       });

//       res.json({ actionResponse: r });
//     } catch (e) {
//       next(e);
//     }
//   }
// );

// function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
//   const R = 6371e3;
//   const φ1 = lat1 * Math.PI / 180;
//   const φ2 = lat2 * Math.PI / 180;
//   const Δφ = (lat2 - lat1) * Math.PI / 180;
//   const Δλ = (lon2 - lon1) * Math.PI / 180;

//   const a =
//     Math.sin(Δφ / 2) ** 2 +
//     Math.cos(φ1) * Math.cos(φ2) *
//     Math.sin(Δλ / 2) ** 2;

//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// }

// //=================== Dashboard =================================

// router.get("/dashboard/summary", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const [
//       totalBeats,
//       activeBeats,
//       pendingQc,
//       actionRequired,
//       approvedToday
//     ] = await Promise.all([
//       prisma.sweepingBeat.count({ where: { cityId } }),

//       prisma.sweepingBeat.count({
//         where: { cityId, assignmentStatus: "ACTIVE" }
//       }),

//       prisma.sweepingInspection.count({
//         where: { cityId, status: "REVIEW_PENDING" }
//       }),

//       prisma.sweepingInspection.count({
//         where: { cityId, status: "ACTION_REQUIRED" }
//       }),

//       prisma.sweepingInspection.count({
//         where: {
//           cityId,
//           status: "APPROVED",
//           createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
//         }
//       })
//     ]);

//     res.json({
//       totalBeats,
//       activeBeats,
//       pendingQc,
//       actionRequired,
//       approvedToday
//     });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/qc-load", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const data = await prisma.sweepingInspection.groupBy({
//       by: ["qcReviewedById"],
//       where: {
//         cityId,
//         status: "REVIEW_PENDING"
//       },
//       _count: true
//     });

//     res.json({ qcLoad: data });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/ward-ranking", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: { cityId, status: "APPROVED" },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const wardMap: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       wardMap[ward] = (wardMap[ward] || 0) + 1;
//     });

//     res.json({ wardRanking: wardMap });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/beat-progress", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const total = await prisma.sweepingBeat.count({ where: { cityId } });

//     const active = await prisma.sweepingBeat.count({
//       where: { cityId, assignmentStatus: "ACTIVE" }
//     });

//     const completed = await prisma.sweepingBeat.count({
//       where: { cityId, assignmentStatus: "COMPLETED" }
//     });

//     res.json({
//       total,
//       active,
//       completed,
//       notStarted: total - active - completed
//     });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/evidence-today", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const count = await prisma.sweepingInspectionPhoto.count({
//       where: {
//         inspection: {
//           cityId,
//           createdAt: {
//             gte: new Date(new Date().setHours(0, 0, 0, 0))
//           }
//         }
//       }
//     });

//     res.json({ photosToday: count });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/map-beats", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;
//     const moduleId = await getModuleIdByName(MODULE_KEY);

//     await assertModuleAccess(req, res, moduleId, [
//       Role.CITY_ADMIN,
//       Role.COMMISSIONER
//     ]);

//     const beats = await prisma.sweepingBeat.findMany({
//       where: { cityId },
//       include: {
//         inspections: {
//           orderBy: { createdAt: "desc" },
//           take: 1
//         },
//         geoNodeBeat: true
//       }
//     });

//     const mapped = beats.map(b => ({
//       id: b.id,
//       lat: b.latitude,
//       lng: b.longitude,
//       name: b.geoNodeBeat.name,
//       status: b.inspections[0]?.status || "NOT_STARTED"
//     }));

//     res.json({ beats: mapped });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/zone-heatmap", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: { cityId, status: "APPROVED" },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const map: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       map[ward] = (map[ward] || 0) + 1;
//     });

//     res.json({ zones: map });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/employee-tracking", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const data = await prisma.sweepingInspection.findMany({
//       where: { cityId },
//       distinct: ["employeeId"],
//       orderBy: { createdAt: "desc" },
//       include: { employee: true }
//     });

//     res.json({
//       employees: data.map(d => ({
//         id: d.employeeId,
//         name: d.employee.name,
//         lat: d.latitude,
//         lng: d.longitude,
//         at: d.createdAt
//       }))
//     });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/qc-sla", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const pending = await prisma.sweepingInspection.findMany({
//       where: { cityId, status: "REVIEW_PENDING" }
//     });

//     const now = Date.now();

//     const enriched = pending.map(p => ({
//       id: p.id,
//       minutes: Math.floor((now - new Date(p.createdAt).getTime()) / 60000)
//     }));

//     res.json({ pending: enriched });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/ward-leaderboard", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const inspections = await prisma.sweepingInspection.findMany({
//       where: { cityId, status: "APPROVED" },
//       include: {
//         sweepingBeat: { include: { geoNodeBeat: true } }
//       }
//     });

//     const map: Record<string, number> = {};

//     inspections.forEach(i => {
//       const ward = i.sweepingBeat.geoNodeBeat.parentId;
//       if (!ward) return;
//       map[ward] = (map[ward] || 0) + 1;
//     });

//     const sorted = Object.entries(map)
//       .sort((a, b) => b[1] - a[1])
//       .map(([wardId, count]) => ({ wardId, count }));

//     res.json({ leaderboard: sorted });
//   } catch (e) {
//     next(e);
//   }
// });

// router.get("/dashboard/zone-polygons", async (req, res, next) => {
//   try {
//     const cityId = req.auth!.cityId!;

//     const wards = await prisma.geoNode.findMany({
//       where: {
//         cityId,
//         level: "WARD"
//       },
//       include: {
//         sweepingBeats: {
//           include: {
//             inspections: {
//               where: { status: "APPROVED" }
//             }
//           }
//         }
//       }
//     });

//     const payload = wards.map(w => ({
//       id: w.id,
//       name: w.name,
//       path: w.path,
//       score: w.sweepingBeats.reduce((a, b) => a + b.inspections.length, 0)
//     }));

//     res.json({ zones: payload });
//   } catch (e) {
//     next(e);
//   }
// });


// export default router;
