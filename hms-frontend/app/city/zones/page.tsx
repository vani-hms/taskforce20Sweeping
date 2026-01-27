'use client';

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";

type GeoNode = { id: string; name: string; createdAt?: string };

export default function ZoneManagementPage() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadZones = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE");
      setZones((data as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ name, level: "ZONE" }) });
      setStatus("Zone created");
      setName("");
      await loadZones();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create zone";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="breadcrumb">
          <span>City Admin</span>
          <span>/</span>
          <span>Zone Management</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Zone Management</h2>
        <p className="muted">Create and manage zones for the active city.</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Create Zone</h3>
          <form onSubmit={createZone} className="form">
            <label>Zone Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Zone"}
            </button>
            {status && <div className="muted">{status}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Zones</h3>
          {loading && <div className="skeleton" style={{ height: 80 }} />}
          {error && <div className="alert error">{error}</div>}
          {!loading && !error && zones.length === 0 && <div className="muted">No zones yet.</div>}
          {!loading && !error && zones.length > 0 && (
            <div className="table-grid">
              <div className="table-head">
                <div>Zone Name</div>
                <div>Created</div>
              </div>
              {zones.map((z) => (
                <div className="table-row" key={z.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{z.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {z.id}
                    </div>
                  </div>
                  <div>{z.createdAt ? new Date(z.createdAt).toLocaleString() : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
