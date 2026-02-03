import { getToken } from "../auth/storage";
import { API_BASE_URL } from "./baseUrl";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as any) || {})
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const ModuleRecordsApi = {
  getRecords: (moduleKey: string) =>
    request<{ city: string; module: string; count: number; records: any[] }>(`/modules/${moduleKey}/records`)
};

export const ToiletApi = {
  // Stats & Dashboard
  getDashboardStats: () => request<{ pendingReview: number; inspectionsDone: number }>("/modules/toilet/stats"),

  // Registration
  requestToilet: (payload: any) => request("/modules/toilet/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  listMyRequests: () => request<{ toilets: any[] }>("/modules/toilet/my-requests"),

  // QC Actions
  listPendingToilets: () => request<{ toilets: any[] }>("/modules/toilet/pending"),
  approveToilet: (id: string, payload: { assignedEmployeeIds?: string[] }) => request(`/modules/toilet/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  rejectToilet: (id: string, remarks: string) => request(`/modules/toilet/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ remarks })
  }),

  // Operational
  listAssignedToilets: () => request<{ toilets: any[] }>("/modules/toilet/assigned"),
  listQuestions: (params?: { toiletId?: string }) => {
    const query = params?.toiletId ? `?toiletId=${params.toiletId}` : "";
    return request<{ questions: any[] }>(`/modules/toilet/inspection-questions${query}`);
  },
  submitInspection: (payload: any) => request("/modules/toilet/inspections/submit", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  updateInspection: (id: string, payload: { status: string; remarks?: string }) => request(`/modules/toilet/inspections/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ status: payload.status, comment: payload.remarks })
  }),
  listInspections: (params: { status?: string }) => {
    const query = params.status ? `?status=${params.status}` : "";
    return request<{ inspections: any[] }>(`/modules/toilet/inspections${query}`);
  },
  listToilets: () => request<{ toilets: any[] }>("/modules/toilet/all"),
  getMyToilets: () => request<{ toilets: any[] }>("/modules/toilet/assigned"),
  getMyInspectionHistory: () => request<{ inspections: any[] }>("/modules/toilet/inspections"),

  // Geo Data Mapping for Screens
  getZones: async () => {
    const res = await request<{ nodes: any[] }>("/city/geo?level=ZONE");
    return { zones: res.nodes };
  },
  getWardsByZone: async (zoneId: string) => {
    const res = await request<{ nodes: any[] }>(`/city/geo?level=WARD`);
    // Filter manually if backend doesn't support parentId query yet
    return { wards: res.nodes.filter(n => n.parentId === zoneId) };
  },
  getAreasByWard: async (wardId: string) => {
    const res = await request<{ nodes: any[] }>(`/city/geo?level=AREA`);
    // Filter manually
    return { areas: res.nodes.filter(n => n.parentId === wardId) };
  },

  // Staff Management
  listEmployees: () => request<{ employees: any[] }>("/modules/toilet/employees")
};
