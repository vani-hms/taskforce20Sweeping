declare const Buffer: any;

export type ModuleAccess = {
  moduleId?: string;
  key: string;
  name?: string;
  canWrite?: boolean;
};

type Session = {
  token?: string;
  roles?: string[];
  cityId?: string;
  cityName?: string;
  modules?: ModuleAccess[];
};

let session: Session = {};

export function setSession(data: Session) {
  session = { ...session, ...data };
}

export function getSession() {
  return session;
}

export async function clearSession() {
  session = {};
}

const LEGACY_KEY_MAP: Record<string, string> = {
  TWINBIN: "LITTERBINS"
};

const normalizeKey = (key: string) => {
  const upper = (key || "").toString().trim().toUpperCase();
  return LEGACY_KEY_MAP[upper] || upper;
};

export function decodeJwt(token: string): { roles?: string[]; cityId?: string; modules?: ModuleAccess[] } {
  try {
    const [, payload] = token.split(".");
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    let json = "";
    if (typeof atob === "function") {
      const decoded = atob(padded);
      json = decodeURIComponent(
        decoded
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else if (typeof Buffer !== "undefined") {
      json = Buffer.from(padded, "base64").toString("utf8");
    }
    const parsed = JSON.parse(json);
    const modules = Array.isArray(parsed.modules)
      ? (parsed.modules as any[])
          .map((m) => ({
            moduleId: m.moduleId,
            key: normalizeKey(m.key || m.name || ""),
            name: m.name,
            canWrite: Boolean(m.canWrite)
          }))
          .reduce<ModuleAccess[]>((acc, cur) => {
            if (!cur.key) return acc;
            if (acc.find((m) => m.key === cur.key)) return acc;
            acc.push(cur);
            return acc;
          }, [])
      : [];
    return { roles: parsed.roles || [], cityId: parsed.cityId, modules };
  } catch {
    return { roles: [], cityId: undefined, modules: [] };
  }
}
