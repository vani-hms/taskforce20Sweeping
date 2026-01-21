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
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token, redirectTo } = await AuthApi.login({ email, password });
      setAuthCookie(token);
      const decoded = decodeToken(token);
      setUser(decoded);
      router.replace(redirectTo || "/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid credentials");
      } else if (err instanceof ApiError) {
        setError(err.message || "Login failed");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="card" style={{ maxWidth: 440, width: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Sign in to HMS</h2>
        <p style={{ color: "var(--muted)" }}>Secure access for HMS administrators and municipal teams.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <div className="input password-input">
              <input
                type={showPassword ? "text" : "password"}
                className="flex-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((s) => !s)}
              >
                <span style={{ fontSize: 12 }}>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
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
