'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";

type GeoNode = { id: string; name: string; parentId?: string };

export default function WardManagementPage() {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [zoneRes, wardRes] = await Promise.all([
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE"),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=WARD")
      ]);
      setZones((zoneRes as any).nodes ?? []);
      setWards((wardRes as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones/wards";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createWard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ name, level: "WARD", parentId: zoneId }) });
      setStatus("Ward created");
      setName("");
      await loadData();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create ward";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const groupedWards = useMemo(() => {
    const map: Record<string, GeoNode[]> = {};
    wards.forEach((w) => {
      if (!w.parentId) return;
      map[w.parentId] = map[w.parentId] || [];
      map[w.parentId].push(w);
    });
    return map;
  }, [wards]);

  return (
    <div className="page">
      <div className="card">
        <div className="breadcrumb">
          <span>City Admin</span>
          <span>/</span>
          <span>Ward Management</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Ward Management</h2>
        <p className="muted">Create wards under zones.</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Create Ward</h3>
          <form onSubmit={createWard} className="form">
            <label>Ward Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            <label>Select Zone</label>
            <select
              className="input"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
              disabled={zones.length === 0}
            >
              <option value="">Select zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit" disabled={!zoneId || saving}>
              {saving ? "Saving..." : "Create Ward"}
            </button>
            {status && <div className="muted">{status}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Wards</h3>
          {loading && <div className="skeleton" style={{ height: 80 }} />}
          {error && <div className="alert error">{error}</div>}
          {!loading && !error && wards.length === 0 && <div className="muted">No wards yet.</div>}
          {!loading && !error && wards.length > 0 && (
            <div className="table-grid">
              <div className="table-head">
                <div>Zone</div>
                <div>Wards</div>
              </div>
              {zones.map((z) => (
                <div className="table-row" key={z.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{z.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {z.id}
                    </div>
                  </div>
                  <div>
                    {(groupedWards[z.id] || []).length === 0 && <span className="muted">No wards</span>}
                    {(groupedWards[z.id] || []).length > 0 && (
                      <ul style={{ paddingLeft: 16, margin: 0 }}>
                        {groupedWards[z.id].map((w) => (
                          <li key={w.id}>{w.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
