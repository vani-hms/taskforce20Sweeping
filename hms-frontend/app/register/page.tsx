'use client';

import { useState } from "react";
import { ApiError, AuthApi } from "@lib/apiClient";

export default function RegisterPage() {
  const [form, setForm] = useState({
    ulbCode: "",
    name: "",
    email: "",
    phone: "",
    aadharNumber: "",
    password: ""
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await AuthApi.registerRequest(form);
      setStatus("Registration request sent to City Admin");
      setForm({ ulbCode: "", name: "", email: "", phone: "", aadharNumber: "", password: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to submit request");
      } else {
        setError("Failed to submit request");
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="page page-centered">
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <h2>User Registration</h2>
        <p className="muted">Submit your details to request access. Approval by the City Admin is required.</p>
        <form onSubmit={onSubmit} className="form">
          <label>City ULB Code</label>
          <input className="input" value={form.ulbCode} onChange={(e) => update("ulbCode", e.target.value)} required />

          <label>Name</label>
          <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />

          <label>Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />

          <label>Phone</label>
          <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />

          <label>Aadhar Number</label>
          <input className="input" value={form.aadharNumber} onChange={(e) => update("aadharNumber", e.target.value)} required />

          <label>Password</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
          />

          {error && <div className="alert error">{error}</div>}
          {status && <div className="alert success">{status}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
