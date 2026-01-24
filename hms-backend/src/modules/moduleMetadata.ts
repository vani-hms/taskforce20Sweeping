const MODULE_LABELS: Record<string, string> = {
  SWEEP_RES: "Sweeping Residential",
  SWEEP_COM: "Sweeping Commercial",
  TWINBIN: "Twinbin",
  TASKFORCE: "Taskforce"
};

export function normalizeModuleKey(key: string) {
  return key.trim().toUpperCase();
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
