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
  registerRequest: (body: {
    ulbCode: string;
    name: string;
    email: string;
    phone: string;
    aadharNumber: string;
    password: string;
    zoneId: string;
    wardId: string;
    cityId?: string;
  }) =>
    apiFetch<{ success: boolean; message: string }>("/auth/register-request", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  logout: async () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
  getMe: async () => apiFetch<{ user: any }>("/auth/me")
};

export const CityApi = {
  list: () => apiFetch("/hms/cities"),
  create: (body: { name: string; code: string; ulbCode: string }) =>
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

export const PublicGeoApi = {
  cities: () => apiFetch<{ cities: { id: string; name: string }[] }>("/public/cities"),
  zones: (cityId: string) => apiFetch<{ zones: { id: string; name: string }[] }>(`/public/cities/${cityId}/zones`),
  wards: (zoneId: string) => apiFetch<{ wards: { id: string; name: string }[] }>(`/public/zones/${zoneId}/wards`)
};

export const CityUserApi = {
  list: () =>
    apiFetch<{
      users: {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
        modules: { id: string; key: string; name: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
        zoneIds?: string[];
        wardIds?: string[];
      }[];
    }>("/city/users"),
  create: (body: {
    name: string;
    email: string;
    password: string;
    role: string;
    zoneIds?: string[];
    wardIds?: string[];
    modules: { moduleId: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
  }) => apiFetch("/city/users", { method: "POST", body: JSON.stringify(body) }),
  update: (
    id: string,
    body: {
      name?: string;
      role?: string;
      zoneIds?: string[];
      wardIds?: string[];
      modules?: { moduleId: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }[];
    }
  ) => apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch<{ success: boolean }>(`/city/users/${id}`, { method: "DELETE" })
};

export const CityModulesApi = {
  list: () => apiFetch<{ id: string; key: string; name: string; enabled: boolean }[]>("/city/modules")
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
    }),
  assigned: () =>
    apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/assigned"),
  feederRequests: () => apiFetch<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/requests"),
  approveRequest: (id: string, body: any) =>
    apiFetch<{ feederPoint: any }>(`/modules/taskforce/feeder-points/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  rejectRequest: (id: string) =>
    apiFetch<{ feederPoint: any }>(`/modules/taskforce/feeder-points/${id}/reject`, { method: "POST" }),
  submitReport: (id: string, body: { latitude: number; longitude: number; payload: any }) =>
    apiFetch<{ report: any }>(`/modules/taskforce/feeder-points/${id}/report`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  pendingReports: () => apiFetch<{ reports: any[] }>("/modules/taskforce/reports/pending"),
  approveReport: (id: string) => apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/approve`, { method: "POST" }),
  rejectReport: (id: string) => apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/reject`, { method: "POST" }),
  actionRequiredReport: (id: string) =>
    apiFetch<{ report: any }>(`/modules/taskforce/reports/${id}/action-required`, { method: "POST" })
};

export const ToiletApi = {
  // Stats & Dashboard
  getDashboardStats: (params?: { startDate?: string; endDate?: string }) => {
    const sp = new URLSearchParams();
    if (params?.startDate) sp.append('startDate', params.startDate);
    if (params?.endDate) sp.append('endDate', params.endDate);
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<any>(`/modules/toilet/stats${query}`);
  },

  // Master & Search
  listToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/assigned"),
  listAllToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/all"),
  getToiletDetails: (id: string) => apiFetch<{ toilet: any }>(`/modules/toilet/${id}`),
  summary: () => apiFetch<{ summary: { status: string; count: number }[] }>("/modules/toilet/reports/summary"),

  // Registration & Approval
  listPendingToilets: () => apiFetch<{ toilets: any[] }>("/modules/toilet/pending"),
  approveToilet: (id: string, body: { assignedEmployeeIds?: string[] } = {}) =>
    apiFetch(`/modules/toilet/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  rejectToilet: (id: string, reason: string) =>
    apiFetch(`/modules/toilet/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  bulkImport: (csvText: string) =>
    apiFetch<{ count: number }>("/modules/toilet/bulk-import", {
      method: "POST",
      body: JSON.stringify({ csvText })
    }),

  // Operational
  listInspections: (params?: { status?: string; employeeId?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (params?.status) sp.append('status', params.status);
    if (params?.employeeId) sp.append('employeeId', params.employeeId);
    if (params?.page) sp.append('page', params.page.toString());
    if (params?.pageSize) sp.append('pageSize', params.pageSize.toString());
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiFetch<{ inspections: any[]; total: number; page: number; pageSize: number }>(`/modules/toilet/inspections${query}`);
  },
  getInspectionDetails: (id: string) => apiFetch<{ inspection: any }>(`/modules/toilet/inspections/${id}`),
  submitInspection: (body: any) =>
    apiFetch("/modules/toilet/inspections/submit", { method: "POST", body: JSON.stringify(body) }),
  reviewInspection: (id: string, body: { status: string; comment?: string }) =>
    apiFetch(`/modules/toilet/inspections/${id}/review`, { method: "POST", body: JSON.stringify(body) }),

  // Geo Data Proxy
  getZones: () => apiFetch<{ nodes: any[] }>("/city/geo?level=ZONE"),
  getWardsByZone: (zoneId: string) => apiFetch<{ nodes: any[] }>(`/city/geo?level=WARD&parentId=${zoneId}`),

  // Assignments
  listEmployees: () => EmployeesApi.list("toilet"),
  bulkAssignToilets: (employeeId: string, toiletIds: string[], category: string) =>
    apiFetch("/modules/toilet/assignments/bulk", {
      method: "POST",
      body: JSON.stringify({ employeeId, toiletIds, category })
    }),
  unassignToilet: (employeeId: string, toiletId: string) =>
    apiFetch("/modules/toilet/assignments/remove", {
      method: "POST",
      body: JSON.stringify({ employeeId, toiletId })
    })
};

export const ModuleRecordsApi = {
  getRecords: (moduleKey: string, filters?: { zoneIds?: string[]; wardIds?: string[] }) => {
    const params = new URLSearchParams();
    if (filters?.zoneIds?.length) filters.zoneIds.forEach(id => params.append("zoneIds", id));
    if (filters?.wardIds?.length) filters.wardIds.forEach(id => params.append("wardIds", id));

    const queryString = params.toString();
    const url = `/modules/${moduleKey}/records${queryString ? `?${queryString}` : ""}`;

    return apiFetch<{ city: string; module: string; count: number; records: any[] }>(url);
  }
};

export const RegistrationApi = {
  listRequests: () =>
    apiFetch<{
      requests: { id: string; name: string; email: string; phone: string; aadhaar: string; status: string; createdAt: string }[];
    }>("/city/registration-requests"),
  approve: (id: string, body: { role: "EMPLOYEE" | "QC" | "ACTION_OFFICER"; moduleKeys: string[] }) =>
    apiFetch<{ success: boolean }>(`/city/registration-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  reject: (id: string, reason?: string) =>
    apiFetch<{ success: boolean }>(`/city/registration-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {})
    })
};

export const EmployeesApi = {
  list: (moduleKey?: string) =>
    apiFetch<{
      employees: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        role: string;
        modules: { id: string; key: string; name: string; canWrite: boolean }[];
        zones: string[];
        wards: string[];
        createdAt: string;
      }[];
    }>(moduleKey ? `/city/employees?moduleKey=${encodeURIComponent(moduleKey)}` : "/city/employees")
};

export const TwinbinApi = {
  requestBin: (body: {
    zoneId?: string;
    wardId?: string;
    areaName: string;
    areaType: string;
    locationName: string;
    roadType: string;
    isFixedProperly: boolean;
    hasLid: boolean;
    condition: string;
    latitude: number;
    longitude: number;
  }) => apiFetch<{ bin: any }>("/modules/twinbin/bins/request", { method: "POST", body: JSON.stringify(body) }),
  myRequests: () =>
    apiFetch<{
      bins: {
        id: string;
        areaName: string;
        locationName: string;
        condition: string;
        status: string;
        createdAt: string;
      }[];
    }>("/modules/twinbin/bins/my-requests"),
  assigned: () =>
    apiFetch<{
      bins: {
        id: string;
        areaName: string;
        locationName: string;
        condition: string;
        status: string;
        createdAt: string;
        latitude?: number;
        longitude?: number;
      }[];
    }>("/modules/twinbin/bins/assigned"),
  myBins: () => apiFetch<{ bins: any[] }>("/modules/twinbin/bins/my"),
  pending: () => apiFetch<{ bins: any[] }>("/modules/twinbin/bins/pending"),
  approve: (id: string, body: { assignedEmployeeIds?: string[] }) =>
    apiFetch<{ bin: any }>(`/modules/twinbin/bins/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  reject: (id: string) => apiFetch<{ bin: any }>(`/modules/twinbin/bins/${id}/reject`, { method: "POST" }),
  submitVisit: (binId: string, body: { latitude: number; longitude: number; inspectionAnswers: Record<string, { answer: "YES" | "NO"; photoUrl: string }> }) =>
    apiFetch<{ report: any }>(`/modules/twinbin/bins/${binId}/visit`, { method: "POST", body: JSON.stringify(body) }),
  submitReport: (binId: string, body: { latitude: number; longitude: number; questionnaire: any; proximityToken: string }) =>
    apiFetch<{ report: any }>(`/modules/twinbin/bins/${binId}/report`, { method: "POST", body: JSON.stringify(body) }),
  reportContext: (binId: string, lat: number, lon: number) => {
    const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
    return apiFetch<{
      allowed: boolean;
      distanceMeters: number;
      message?: string;
      bin?: any;
      formConfig?: any;
      proximityToken: string | null;
    }>(`/modules/twinbin/bins/${binId}/report-context?${params.toString()}`);
  },
  pendingVisits: () =>
    apiFetch<{ visits: any[] }>("/modules/twinbin/visits/pending"),
  approveVisit: (id: string) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/approve`, { method: "POST" }),
  rejectVisit: (id: string) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/reject`, { method: "POST" }),
  markActionRequired: (id: string, body: { qcRemark: string }) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/action-required`, { method: "POST", body: JSON.stringify(body) }),
  listActionRequired: () =>
    apiFetch<{ visits: any[] }>("/modules/twinbin/visits/action-required"),
  submitActionTaken: (id: string, body: { actionRemark: string; actionPhotoUrl: string }) =>
    apiFetch<{ visit: any }>(`/modules/twinbin/visits/${id}/action-taken`, { method: "POST", body: JSON.stringify(body) }),
  pendingReports: () => apiFetch<{ reports: any[] }>("/modules/twinbin/reports/pending"),
  approveReport: (id: string) => apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/approve`, { method: "POST" }),
  rejectReport: (id: string) => apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/reject`, { method: "POST" }),
  actionRequiredReport: (id: string) =>
    apiFetch<{ report: any }>(`/modules/twinbin/reports/${id}/action-required`, { method: "POST" })
};
