'use client';

import { useEffect, useState } from "react";
import { ApiError, AuthApi, PublicGeoApi } from "@lib/apiClient";

export default function RegisterPage() {
  const [form, setForm] = useState({
    ulbCode: "",
    name: "",
    email: "",
    phone: "",
    aadharNumber: "",
    password: "",
    cityId: "",
    zoneId: "",
    wardId: ""
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    PublicGeoApi.cities().then((res) => setCities(res.cities || [])).catch(() => {});
  }, []);

  const handleCity = async (cityId: string) => {
    setForm((f) => ({ ...f, cityId, zoneId: "", wardId: "" }));
    setZones([]);
    setWards([]);
    if (!cityId) return;
    setLoadingGeo(true);
    try {
      const res = await PublicGeoApi.zones(cityId);
      setZones(res.zones || []);
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleZone = async (zoneId: string) => {
    setForm((f) => ({ ...f, zoneId, wardId: "" }));
    setWards([]);
    if (!zoneId) return;
    setLoadingGeo(true);
    try {
      const res = await PublicGeoApi.wards(zoneId);
      setWards(res.wards || []);
    } finally {
      setLoadingGeo(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatus("");
    try {
      if (!form.cityId || !form.zoneId || !form.wardId) {
        setError("City, zone, and ward are required");
        setLoading(false);
        return;
      }
      await AuthApi.registerRequest(form);
      setStatus("Registration request sent to City Admin");
      setForm({
        ulbCode: "",
        name: "",
        email: "",
        phone: "",
        aadharNumber: "",
        password: "",
        cityId: "",
        zoneId: "",
        wardId: ""
      });
      setZones([]);
      setWards([]);
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

          <label>City</label>
          <select className="input" value={form.cityId} onChange={(e) => handleCity(e.target.value)} required>
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label>Zone</label>
          <select
            className="input"
            value={form.zoneId}
            onChange={(e) => handleZone(e.target.value)}
            required
            disabled={!form.cityId || loadingGeo}
          >
            <option value="">Select zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          <label>Ward</label>
          <select
            className="input"
            value={form.wardId}
            onChange={(e) => update("wardId", e.target.value)}
            required
            disabled={!form.zoneId || loadingGeo}
          >
            <option value="">Select ward</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

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
