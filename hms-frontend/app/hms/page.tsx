'use client';

import { useEffect, useState } from "react";
import { ApiError, CityApi } from "@lib/apiClient";

interface CityAdminInfo {
  name: string;
  email: string;
}

interface CityRow {
  id: string;
  name: string;
  code: string;
  ulbCode?: string;
  enabled: boolean;
  cityAdmin: CityAdminInfo | null;
}

export default function HmsDashboardPage() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityName, setCityName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityUlbCode, setCityUlbCode] = useState("");
  const [cityStatus, setCityStatus] = useState("");

  const [adminCityId, setAdminCityId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const cityRes = await CityApi.list();
      setCities((cityRes as any).cities ?? cityRes);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityStatus("Creating...");
    try {
      await CityApi.create({ name: cityName, code: cityCode, ulbCode: cityUlbCode || cityCode });
      setCityStatus("City created.");
      setCityName("");
      setCityCode("");
      setCityUlbCode("");
      await refresh();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to create city.";
      setCityStatus(message);
    }
  };

  const handleToggleCity = async (cityId: string, enabled: boolean) => {
    try {
      await CityApi.setEnabled(cityId, enabled);
      setCities((prev) => prev.map((c) => (c.id === cityId ? { ...c, enabled } : c)));
    } catch (err) {
      alert("Failed to toggle city: " + (err instanceof ApiError ? err.message : ""));
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus("Creating...");
    try {
      await CityApi.createCityAdmin(adminCityId, {
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });
      setAdminStatus("City admin created.");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      await refresh();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to create city admin.";
      setAdminStatus(message);
    }
  };

  return (
    <div className="page">
      <div className="breadcrumb">
        <span>HMS</span>
        <span>/</span>
        <span>Dashboard</span>
      </div>
      <h1 style={{ marginTop: 0 }}>HMS Super Admin</h1>
      {error && <div className="alert error">Error: {error}</div>}
      {loading ? (
        <div className="skeleton" style={{ height: 120 }} />
      ) : (
        <>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>City Overview</h3>
              <span className="badge">Cities</span>
            </div>
            <div className="table-grid">
              <div className="table-head">
                <div>City</div>
                <div>Code</div>
                <div>ULB Code</div>
                <div>City Admin</div>
                <div>Email</div>
                <div>Status</div>
              </div>
              {cities.map((city) => (
                <div className="table-row" key={city.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{city.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {city.id}
                    </div>
                  </div>
                  <div>{city.code}</div>
                  <div>{city.ulbCode || "—"}</div>
                  <div>{city.cityAdmin?.name || "—"}</div>
                  <div>{city.cityAdmin?.email || "—"}</div>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={city.enabled}
                        onChange={(e) => handleToggleCity(city.id, e.target.checked)}
                      />
                      {city.enabled ? "Active" : "Inactive"}
                    </label>
                  </div>
                </div>
              ))}
              {cities.length === 0 && <div className="table-row">No cities yet.</div>}
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h3>Create City</h3>
              <form onSubmit={handleCreateCity} className="form">
                <label>Name</label>
                <input className="input" value={cityName} onChange={(e) => setCityName(e.target.value)} required />
                <label>Code</label>
                <input className="input" value={cityCode} onChange={(e) => setCityCode(e.target.value)} required />
                <label>ULB Code</label>
                <input
                  className="input"
                  value={cityUlbCode}
                  onChange={(e) => setCityUlbCode(e.target.value)}
                  placeholder="Enter ULB code"
                />
                <button className="btn btn-primary" type="submit">
                  Create
                </button>
                {cityStatus && <div className="muted">{cityStatus}</div>}
              </form>
            </div>
            <div className="card">
              <h3>Create City Admin</h3>
              <form onSubmit={handleCreateAdmin} className="form">
                <label>City</label>
                <select
                  className="input"
                  value={adminCityId}
                  onChange={(e) => setAdminCityId(e.target.value)}
                  required
                >
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <label>Name</label>
                <input
                  className="input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <label>Password</label>
                <input
                  className="input"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <button className="btn btn-primary" type="submit">
                  Create admin
                </button>
                {adminStatus && <div className="muted">{adminStatus}</div>}
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
