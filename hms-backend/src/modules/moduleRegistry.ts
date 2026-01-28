import { prisma } from "../prisma";
import { normalizeModuleKey } from "./moduleMetadata";
import { syncAllCityModules } from "../utils/cityModuleSync";

const cache: Record<string, string> = {};

export async function getModuleIdByName(name: string): Promise<string> {
  const canonical = normalizeModuleKey(name);
  if (cache[canonical]) return cache[canonical];

  let module = await prisma.module.findFirst({
    where: { name: { in: [canonical, name.toUpperCase()] } }
  });
  if (!module) {
    module = await prisma.module.create({ data: { name: canonical, isActive: true } });
    await syncAllCityModules();
  }

  cache[canonical] = module.id;
  return module.id;
}
