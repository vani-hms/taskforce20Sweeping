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
