"use server";

import { RegistrationApi } from "@lib/apiClient";
import { cookies } from "next/headers";

export async function approveRequest(id: string) {
  const token = cookies().get("hms_access_token")?.value;
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/city/registration-requests/${id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

export async function rejectRequest(id: string, reason?: string) {
  const token = cookies().get("hms_access_token")?.value;
  await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/city/registration-requests/${id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(reason ? { reason } : {})
  });
}
