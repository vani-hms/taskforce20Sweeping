import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireCityContext, assertModuleAccess } from "../middleware/rbac";
import { prisma } from "../prisma";
import { HttpError } from "../utils/errors";
import { Role } from "../../generated/prisma";
import { getModuleLabel, isCanonicalModuleKey, normalizeModuleKey } from "./moduleMetadata";
import { getModuleIdByName } from "./moduleRegistry";

const router = Router();
router.use(authenticate, requireCityContext());

const MODULE_MODEL_MAP: Record<string, keyof typeof prisma> = {
  SWEEPING: "sweepingRecord",
  LITTERBINS: "litterBinRecord",
  TASKFORCE: "taskforceRecord"
};

router.get("/:moduleKey/records", async (req, res, next) => {
  try {
    const cityId = req.auth!.cityId!;
    const moduleKey = normalizeModuleKey(req.params.moduleKey || "");
    if (!isCanonicalModuleKey(moduleKey)) throw new HttpError(400, "Invalid module key");
    const modelName = MODULE_MODEL_MAP[moduleKey];
    if (!modelName) throw new HttpError(400, "Invalid module key");

    const moduleId = await getModuleIdByName(moduleKey);
    await assertModuleAccess(req, res, moduleId, [
      Role.CITY_ADMIN,
      Role.COMMISSIONER,
      Role.ACTION_OFFICER,
      Role.EMPLOYEE,
      Role.QC
    ]);

    const enabled = await prisma.cityModule.findUnique({ where: { cityId_moduleId: { cityId, moduleId } } });
    if (!enabled || !enabled.enabled) throw new HttpError(403, "Module not enabled for this city");

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    const model = (prisma as any)[modelName];
    if (!model) throw new HttpError(500, "Module records not configured");

    const records = await model.findMany({ where: { cityId }, orderBy: { createdAt: "desc" } });
    res.json({
      city: city?.name || cityId,
      module: getModuleLabel(moduleKey),
      count: records.length,
      records
    });
  } catch (err) {
    next(err);
  }
});

export default router;
