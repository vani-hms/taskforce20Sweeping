import type { ModuleAccess } from "../../auth/session";


  const LEGACY_MAP: Record<string, string> = {
  TWINBIN: "LITTERBINS",

  // 👇 ADD THIS
  SWEEP_RES: "SWEEPING",
  SWEEP_COM: "SWEEPING",
  SWEEPING: "SWEEPING"
};



export function normalizeModuleKey(key: string) {
  const upper = (key || "").trim().toUpperCase();
  return LEGACY_MAP[upper] || upper;
}

export function canonicalizeModules<T extends { key: string }>(modules: T[] = []) {
  const map = new Map<string, T & { key: string }>();
  modules.forEach((mod) => {
    const normalized = normalizeModuleKey(mod.key);
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, { ...mod, key: normalized });
    }
  });
  return Array.from(map.values());
}

export function canonicalizeAccessModules(modules: ModuleAccess[] = []) {
  return canonicalizeModules(modules);
}
