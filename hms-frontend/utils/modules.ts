import type { AuthUser, Role } from "../types/auth";

export const CANONICAL_MODULE_KEYS = ["TASKFORCE", "LITTERBINS", "SWEEPING", "TOILET"] as const;
export type CanonicalModuleKey = (typeof CANONICAL_MODULE_KEYS)[number];

export const normalizeModuleKey = (key: string) => (key || "").trim().toUpperCase();

export const isCanonicalModuleKey = (key: string): key is CanonicalModuleKey =>
  (CANONICAL_MODULE_KEYS as readonly string[]).includes(normalizeModuleKey(key));

/**
 * Deduplicate and coerce modules to canonical keys, preferring records whose original key was already canonical.
 */
export function canonicalizeModules<T extends { key: string }>(modules: T[] = []) {
  const seen = new Map<
    CanonicalModuleKey,
    { value: T & { key: CanonicalModuleKey }; cameFromCanonical: boolean }
  >();

  modules.forEach((mod) => {
    const rawKey = normalizeModuleKey(mod.key);
    if (!isCanonicalModuleKey(rawKey)) return;
    const cameFromCanonical = isCanonicalModuleKey(mod.key);
    const candidate = { ...mod, key: rawKey as CanonicalModuleKey };
    const existing = seen.get(rawKey as CanonicalModuleKey);
    if (!existing || (cameFromCanonical && !existing.cameFromCanonical)) {
      seen.set(rawKey as CanonicalModuleKey, { value: candidate, cameFromCanonical });
    }
  });

  return Array.from(seen.values()).map((entry) => entry.value);
}

export function routeForModule(key: CanonicalModuleKey) {
  if (key === "LITTERBINS") return "litterbins";
  if (key === "TASKFORCE") return "taskforce";
  return key.toLowerCase();
}

export function moduleEmployeePath(key: CanonicalModuleKey) {
  const base = routeForModule(key);
  if (key === "TASKFORCE") return `/modules/${base}/tasks`;
  if (key === "TOILET") return `/modules/${base}`;
  return `/modules/${base}/employee`;
}

export function moduleQcPath(key: CanonicalModuleKey) {
  const base = routeForModule(key);
  // Modules with dedicated QC sub-routes
  if (key === "LITTERBINS" || key === "TASKFORCE") {
    return `/modules/${base}/qc`;
  }
  // Sweeping has no dedicated UI yet, land on module list
  if (key === "SWEEPING") return "/modules";
  // Others (like TOILET) use the main module page which handles roles with tabs
  return `/modules/${base}`;
}

export function moduleAdminPath(key: CanonicalModuleKey) {
  const base = routeForModule(key);
  if (key === "TOILET") return `/modules/${base}`;
  return `/modules/${base}/admin`;
}

export function moduleEntryPath(user: AuthUser | null, key: CanonicalModuleKey) {
  if (!user) return `/modules/${routeForModule(key)}`;

  if (user.roles.includes("ACTION_OFFICER" as Role)) {
    if (key === "LITTERBINS") return "/modules/litterbins/action-officer";
    if (key === "TASKFORCE") return "/modules/taskforce/action-officer";
    return `/modules/${routeForModule(key)}`;
  }
  if (user.roles.includes("QC" as Role)) return moduleQcPath(key);
  if (user.roles.includes("CITY_ADMIN" as Role) || user.roles.includes("COMMISSIONER" as Role)) {
    return moduleAdminPath(key);
  }
  return moduleEmployeePath(key);
}

export function getPostLoginRedirect(user: AuthUser | null) {
  if (!user) return "/login";
  if (user.roles.includes("HMS_SUPER_ADMIN" as Role)) return "/hms";

  if (user.roles.includes("ACTION_OFFICER" as Role)) {
    const modules = canonicalizeModules(user.modules || []);
    const aoModule =
      modules.find((m) => m.key === "LITTERBINS" && (m.roles || []).includes("ACTION_OFFICER")) ||
      modules.find((m) => m.key === "TASKFORCE" && (m.roles || []).includes("ACTION_OFFICER")) ||
      modules.find((m) => (m.roles || []).includes("ACTION_OFFICER"));
    if (aoModule?.key === "LITTERBINS") return "/modules/litterbins/action-officer";
    if (aoModule?.key === "TASKFORCE") return "/modules/taskforce/action-officer";
    return "/modules/taskforce/action-officer";
  }

  const modules = canonicalizeModules(user.modules || []);
  if (!modules.length) return "/modules";

  if (user.roles.includes("QC" as Role)) {
    // Prioritize Cleanliness of Toilets for QC
    if (modules.some(m => m.key === 'TOILET' && (m.roles || []).includes('QC'))) {
      return moduleQcPath('TOILET');
    }
    const qcModule = modules.find((m) => (m.roles || []).includes("QC")) || modules[0];
    return moduleQcPath(qcModule.key);
  }

  if (user.roles.includes("CITY_ADMIN" as Role) || user.roles.includes("COMMISSIONER" as Role)) {
    return "/city";
  }

  const employeeModule = modules[0];
  return moduleEmployeePath(employeeModule.key);
}
