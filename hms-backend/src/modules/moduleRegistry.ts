import { prisma } from "../prisma";
import { isCanonicalModuleKey, normalizeModuleKey } from "./moduleMetadata";
import { syncAllCityModules } from "../utils/cityModuleSync";
import { HttpError } from "../utils/errors";

const cache: Record<string, string> = {};

export async function getModuleIdByName(name: string): Promise<string> {
  const canonical = normalizeModuleKey(name);
  if (!isCanonicalModuleKey(canonical)) {
    throw new HttpError(400, `Invalid module: ${name}`);
  }
  if (cache[canonical]) return cache[canonical];

  let module = await prisma.module.findUnique({ where: { name: canonical } });
  if (!module) {
    module = await prisma.module.create({ data: { name: canonical, isActive: true } });
    await syncAllCityModules();
  }

  cache[canonical] = module.id;
  return module.id;
}
