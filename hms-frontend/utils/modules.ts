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
  if (key === "SWEEPING") return "modules"; // placeholder until dedicated UI exists
  return key.toLowerCase();
}
