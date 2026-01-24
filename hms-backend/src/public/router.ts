import { Router } from "express";
import { prisma } from "../prisma";
import { HttpError } from "../utils/errors";

const router = Router();

router.get("/cities", async (_req, res, next) => {
  try {
    const cities = await prisma.city.findMany({ where: { enabled: true }, select: { id: true, name: true } });
    res.json({ cities });
  } catch (err) {
    next(err);
  }
});

router.get("/cities/:cityId/zones", async (req, res, next) => {
  try {
    const { cityId } = req.params;
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new HttpError(404, "City not found");
    const zones = await prisma.geoNode.findMany({
      where: { cityId, level: "ZONE" },
      select: { id: true, name: true }
    });
    res.json({ zones });
  } catch (err) {
    next(err);
  }
});

router.get("/zones/:zoneId/wards", async (req, res, next) => {
  try {
    const { zoneId } = req.params;
    const zone = await prisma.geoNode.findUnique({ where: { id: zoneId } });
    if (!zone || zone.level !== "ZONE") throw new HttpError(404, "Zone not found");
    const wards = await prisma.geoNode.findMany({
      where: { parentId: zoneId, level: "WARD" },
      select: { id: true, name: true }
    });
    res.json({ wards });
  } catch (err) {
    next(err);
  }
});

export default router;
