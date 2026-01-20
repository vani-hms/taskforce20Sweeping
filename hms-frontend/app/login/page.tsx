'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, AuthApi } from "@lib/apiClient";
import { setAuthCookie, decodeToken } from "@lib/auth";
import { useAuth } from "@hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await AuthApi.login({ email, password });
      setAuthCookie(token);
      const decoded = decodeToken(token);
      setUser(decoded);

      // Route users to their primary workspace; super admin lands on HMS area to manage cities/admins.
      const roles = decoded?.roles || [];
      const target =
        roles.includes("HMS_SUPER_ADMIN")
          ? "/hms"
          : roles.includes("CITY_ADMIN")
            ? "/city"
            : roles.length === 0
              ? "/hms" // fallback: treat no-role logins as HMS bootstrap
              : "/";
      router.replace(target);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid credentials");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Sign in to HMS</h2>
        <p style={{ color: "var(--muted)" }}>Secure access for HMS administrators and municipal teams.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
