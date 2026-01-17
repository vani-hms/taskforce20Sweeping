import { getTokenFromCookies } from "@lib/auth";
import { ModuleName } from "@types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function buildHeaders(initHeaders?: HeadersInit) {
  const token = getTokenFromCookies();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...initHeaders
  };
  return headers;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders(init.headers);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "include"
  });

  if (!res.ok) {
    const message = await res.text();
    throw new ApiError(res.status, message || res.statusText);
  }

  return res.json();
}

export const AuthApi = {
  login: async (body: { email: string; password: string; cityId?: string }) =>
    apiFetch<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    })
};

export const CityApi = {
  list: () => apiFetch("/hms/cities"),
  create: (body: { name: string; code: string }) =>
    apiFetch("/hms/cities", { method: "POST", body: JSON.stringify(body) }),
  toggleModule: (cityId: string, moduleId: string, enabled: boolean) =>
    apiFetch(`/hms/cities/${cityId}/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    })
};

// Module resolution cache (expects backend to expose module listing)
let moduleMap: Record<string, string> | null = null;
async function ensureModuleMap() {
  if (moduleMap) return moduleMap;
  const result = await apiFetch<{ modules: { id: string; name: string }[] }>("/modules");
  moduleMap = Object.fromEntries(result.modules.map((m) => [m.name.toUpperCase(), m.id]));
  return moduleMap;
}

export async function getModuleId(moduleName: ModuleName): Promise<string | undefined> {
  const map = await ensureModuleMap();
  return map[moduleName];
}

export const TaskforceApi = {
  listCases: () => apiFetch<{ cases: any[] }>("/modules/taskforce/cases"),
  createCase: (body: { title: string; status?: string; geoNodeId?: string; assignedTo?: string }) =>
    apiFetch<{ case: any }>("/modules/taskforce/cases", { method: "POST", body: JSON.stringify(body) }),
  updateCase: (id: string, body: { status?: string; assignedTo?: string }) =>
    apiFetch<{ case: any }>(`/modules/taskforce/cases/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  addActivity: (id: string, body: { action: string; metadata?: any }) =>
    apiFetch<{ activity: any }>(`/modules/taskforce/cases/${id}/activity`, {
      method: "POST",
      body: JSON.stringify(body)
    })
};
