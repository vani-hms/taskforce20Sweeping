import { getToken } from "../auth/storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function login(body: { email: string; password: string }) {
  return request<{ token: string; user: { cityName?: string; modules?: { key: string; name?: string; canWrite: boolean }[] } }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(body)
    }
  );
}

export async function fetchCityInfo() {
  return request<{ city: { id: string; name: string } }>("/city/info");
}

export async function listRegistrationRequests() {
  return request<{ requests: { id: string; name: string; status: string }[] }>("/city/registration-requests");
}

export async function listModules() {
  return request<{ id: string; key: string; name: string; enabled: boolean }[]>("/city/modules");
}

export async function listGeo(level: "ZONE" | "WARD") {
  return request<{ nodes: { id: string; name: string; parentId?: string | null }[] }>(
    `/city/geo?level=${level}`
  );
}

export async function approveRegistrationRequest(
  id: string,
  body: { role: "EMPLOYEE" | "QC" | "ACTION_OFFICER"; moduleKeys: string[]; zoneIds?: string[]; wardIds?: string[] }
) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API_BASE_URL}/city/registration-requests/${id}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.json() as Promise<{ success: boolean }>;
}

export async function requestTwinbinBin(body: {
  zoneId?: string;
  wardId?: string;
  areaName: string;
  areaType: "RESIDENTIAL" | "COMMERCIAL" | "SLUM";
  locationName: string;
  roadType: string;
  isFixedProperly: boolean;
  hasLid: boolean;
  condition: "GOOD" | "DAMAGED";
  latitude: number;
  longitude: number;
}) {
  return request<{ bin: any }>("/modules/twinbin/bins/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function listTwinbinMyRequests() {
  return request<{ bins: any[] }>("/modules/twinbin/bins/my-requests");
}

export async function listTwinbinAssigned() {
  return request<{ bins: any[] }>("/modules/twinbin/bins/assigned");
}

export async function submitTwinbinVisit(
  binId: string,
  body: {
    latitude: number;
    longitude: number;
    inspectionAnswers: Record<string, { answer: "YES" | "NO"; photoUrl: string }>;
  }
) {
  return request<{ report: any }>(`/modules/twinbin/bins/${binId}/visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function submitTwinbinReport(
  binId: string,
  body: { latitude: number; longitude: number; questionnaire: any; proximityToken: string }
) {
  return request<{ report: any }>(`/modules/twinbin/bins/${binId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function getTwinbinReportContext(binId: string, lat: number, lon: number) {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
  return request<{
    allowed: boolean;
    distanceMeters: number;
    message?: string;
    formConfig: any;
    bin?: any;
    proximityToken: string | null;
  }>(`/modules/twinbin/bins/${binId}/report-context?${params.toString()}`, {
    method: "GET",
    headers: { ...(await authHeader()) } as any
  } as any);
}

export async function listTwinbinVisitPending() {
  return request<{ visits: any[] }>("/modules/twinbin/visits/pending");
}

export async function approveTwinbinVisit(id: string) {
  return request<{ visit: any }>(`/modules/twinbin/visits/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function rejectTwinbinVisit(id: string) {
  return request<{ visit: any }>(`/modules/twinbin/visits/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function listTwinbinPending() {
  return request<{ bins: any[] }>("/modules/twinbin/bins/pending");
}

export async function approveTwinbinBin(id: string, body: { assignedEmployeeIds?: string[] }) {
  return request<{ bin: any }>(`/modules/twinbin/bins/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function rejectTwinbinBin(id: string) {
  return request<{ bin: any }>(`/modules/twinbin/bins/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function markTwinbinVisitActionRequired(id: string, qcRemark: string) {
  return request<{ visit: any }>(`/modules/twinbin/visits/${id}/action-required`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ qcRemark })
  } as any);
}

export async function listTwinbinActionRequired() {
  return request<{ visits: any[] }>("/modules/twinbin/visits/action-required");
}

export async function submitTwinbinActionTaken(id: string, body: { actionRemark: string; actionPhotoUrl: string }) {
  return request<{ visit: any }>(`/modules/twinbin/visits/${id}/action-taken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function listTwinbinReportsPending() {
  return request<{ reports: any[] }>("/modules/twinbin/reports/pending");
}

export async function approveTwinbinReport(id: string) {
  return request<{ report: any }>(`/modules/twinbin/reports/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function rejectTwinbinReport(id: string) {
  return request<{ report: any }>(`/modules/twinbin/reports/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function actionRequiredTwinbinReport(id: string) {
  return request<{ report: any }>(`/modules/twinbin/reports/${id}/action-required`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

// Taskforce feeder points (employee)
export async function listTaskforceAssigned() {
  return request<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/assigned");
}

export async function submitTaskforceFeederRequest(body: {
  zoneId?: string;
  wardId?: string;
  zoneName?: string;
  wardName?: string;
  areaName: string;
  areaType: "RESIDENTIAL" | "COMMERCIAL" | "SLUM";
  feederPointName: string;
  locationDescription: string;
  populationDensity: string;
  accessibilityLevel: string;
  householdsCount: number;
  vehicleType: string;
  landmark: string;
  photoUrl: string;
  notes?: string;
  latitude: number;
  longitude: number;
}) {
  return request<{ feederPoint: any }>("/modules/taskforce/feeder-points/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

export async function listTaskforceFeederRequests() {
  return request<{ feederPoints: any[] }>("/modules/taskforce/feeder-points/my-requests");
}

export async function submitTaskforceReport(
  feederPointId: string,
  body: { latitude: number; longitude: number; payload: any }
) {
  return request<{ report: any }>(`/modules/taskforce/feeder-points/${feederPointId}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body)
  } as any);
}

async function authHeader() {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitRegistration(body: {
  ulbCode: string;
  name: string;
  email: string;
  phone: string;
  aadharNumber: string;
  password: string;
}) {
  return request<{ success: boolean; message: string }>("/auth/register-request", {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function listTaskforceReportsPending() {
  return request<{ reports: any[] }>("/modules/taskforce/reports/pending");
}

export async function approveTaskforceReport(id: string) {
  return request<{ report: any }>(`/modules/taskforce/reports/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function rejectTaskforceReport(id: string) {
  return request<{ report: any }>(`/modules/taskforce/reports/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}

export async function actionRequiredTaskforceReport(id: string) {
  return request<{ report: any }>(`/modules/taskforce/reports/${id}/action-required`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) }
  } as any);
}
