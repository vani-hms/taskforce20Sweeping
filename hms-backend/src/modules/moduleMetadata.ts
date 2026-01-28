export const CANONICAL_MODULE_KEYS = ["TASKFORCE", "LITTERBINS", "SWEEPING", "TOILET"] as const;

const LEGACY_KEY_MAP: Record<string, string> = {
  SWEEP_RES: "SWEEPING",
  SWEEP_COM: "SWEEPING",
  TWINBIN: "LITTERBINS"
};

const MODULE_LABELS: Record<string, string> = {
  TASKFORCE: "CTU / GVP Transformation",
  LITTERBINS: "Litter Bins",
  SWEEPING: "Sweeping",
  TOILET: "Cleanliness of Toilets",
  // legacy keys fallbacks
  TWINBIN: "Litter Bins",
  SWEEP_RES: "Sweeping",
  SWEEP_COM: "Sweeping"
};

export function normalizeModuleKey(key: string) {
  const upper = key.trim().toUpperCase();
  return LEGACY_KEY_MAP[upper] || upper;
}

export function getModuleLabel(key: string) {
  const normalized = normalizeModuleKey(key);
  const predefined = MODULE_LABELS[normalized];
  if (predefined) return predefined;
  return normalized
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
