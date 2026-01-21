import { getTokenFromCookies } from "@lib/auth";
import type { ModuleName } from "../types/auth";

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
    apiFetch<{ token: string; user: any; redirectTo: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  logout: async () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" })
};

export const CityApi = {
  list: () => apiFetch("/hms/cities"),
  create: (body: { name: string; code: string }) =>
    apiFetch("/hms/cities", { method: "POST", body: JSON.stringify(body) }),
  setEnabled: (cityId: string, enabled: boolean) =>
    apiFetch(`/hms/cities/${cityId}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  toggleModule: (cityId: string, moduleId: string, enabled: boolean) =>
    apiFetch(`/hms/cities/${cityId}/modules/${moduleId}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  createCityAdmin: (cityId: string, body: { email: string; password: string; name: string }) =>
    apiFetch(`/hms/cities/${cityId}/admins`, {
      method: "POST",
      body: JSON.stringify({ ...body, cityId })
    })
};

export const ModuleApi = {
  list: () => apiFetch<{ modules: { id: string; name: string }[] }>("/hms/modules")
};

export const GeoApi = {
  list: (level?: string) => apiFetch<{ nodes: any[] }>(level ? `/city/geo?level=${level}` : "/city/geo"),
  create: (body: any) => apiFetch<{ node: any }>("/city/geo", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch<{ node: any }>(`/city/geo/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/geo/${id}`, { method: "DELETE" })
};

export const CityUserApi = {
  list: () =>
    apiFetch<{ users: { id: string; name: string; email: string; role: string; createdAt: string }[] }>(
      "/city/users"
    ),
  create: (body: { name: string; email: string; password: string; role: string; moduleId?: string; canWrite?: boolean }) =>
    apiFetch("/city/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; role?: string; moduleId?: string; canWrite?: boolean }) =>
    apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "DELETE" })
};

// Module resolution cache (expects backend to expose module listing)
let moduleMap: Record<string, string> | null = null;
async function ensureModuleMap() {
  if (moduleMap) return moduleMap;
  const result = await ModuleApi.list();
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

export const IecApi = {
  createForm: (body: { title: string; description?: string }) =>
    apiFetch<{ form: any }>("/modules/iec/forms", { method: "POST", body: JSON.stringify(body) }),
  updateForm: (id: string, body: { title?: string; description?: string; status?: string }) =>
    apiFetch<{ form: any }>(`/modules/iec/forms/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  listForms: () => apiFetch<{ forms: any[] }>("/modules/iec/forms"),
  summary: () => apiFetch<{ summary: { status: string; count: number }[] }>("/modules/iec/reports/summary")
};
