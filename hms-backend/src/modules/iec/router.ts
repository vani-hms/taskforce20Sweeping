import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireCityContext, requireModuleRoles } from "../../middleware/rbac";
import { Role } from "../../../generated/prisma";

const IEC_MODULE_ID = "IEC_MODULE_ID_PLACEHOLDER";

const router = Router();
router.use(
  authenticate,
  requireCityContext(),
  requireModuleRoles(IEC_MODULE_ID, [
    Role.EMPLOYEE,
    Role.QC,
    Role.ACTION_OFFICER,
    Role.CITY_ADMIN,
    Role.HMS_SUPER_ADMIN
  ])
);

router.get("/dashboard", (_req, res) => {
  res.json({ message: "IEC dashboard placeholder" });
});

export default router;
