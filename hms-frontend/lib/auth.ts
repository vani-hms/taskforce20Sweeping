import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/auth";

export const AUTH_COOKIE = "hms_access_token";

function setBrowserCookie(token: string) {
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; samesite=lax; ${
    process.env.NODE_ENV === "production" ? "secure;" : ""
  }`;
}

export function setAuthCookie(token: string) {
  if (typeof window !== "undefined") {
    setBrowserCookie(token);
    return;
  }
  // Server-side render fallback
  const { cookies } = require("next/headers");
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export function clearAuthCookie() {
  if (typeof window !== "undefined") {
    document.cookie = `${AUTH_COOKIE}=; Max-Age=0; path=/`;
    return;
  }
  const { cookies } = require("next/headers");
  cookies().delete(AUTH_COOKIE);
}

export function getTokenFromCookies(): string | undefined {
  if (typeof window !== "undefined") {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE}=`));
    return match?.split("=")?.[1];
  }
  const { cookies } = require("next/headers");
  return cookies().get(AUTH_COOKIE)?.value;
}

// NOTE: In production, validate the JWT signature with the backend's public key/secret.
export function decodeToken(token?: string): AuthUser | null {
  if (!token) return null;
  try {
    const decoded = jwt.decode(token) as AuthUser | null;
    if (!decoded) return null;
    if (decoded && (decoded as any).exp && Date.now() >= ((decoded as any).exp as number) * 1000) {
      return null; // expired
    }
    return decoded;
  } catch (err) {
    console.error("Failed to decode token", err);
    return null;
  }
}
