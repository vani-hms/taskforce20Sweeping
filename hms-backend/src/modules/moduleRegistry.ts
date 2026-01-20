import { prisma } from "../prisma";

const cache: Record<string, string> = {};

export async function getModuleIdByName(name: string): Promise<string> {
  const key = name.toUpperCase();
  if (cache[key]) return cache[key];
  const module = await prisma.module.findUnique({ where: { name: key } });
  if (!module) {
    throw new Error(`Module not found: ${key}`);
  }
  cache[key] = module.id;
  return module.id;
}
