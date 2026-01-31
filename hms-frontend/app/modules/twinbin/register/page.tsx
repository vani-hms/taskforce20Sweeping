'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, GeoApi, TwinbinApi } from "@lib/apiClient";

type GeoNode = { id: string; name: string; parentId?: string | null };

export default function TwinbinRegisterPage() {
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [form, setForm] = useState({
    zoneId: "",
    wardId: "",
    areaType: "RESIDENTIAL",
    areaName: "",
    locationName: "",
    roadType: "",
    isFixedProperly: false,
    hasLid: false,
    condition: "GOOD",
    latitude: "",
    longitude: ""
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [locFetching, setLocFetching] = useState(false);

  useEffect(() => {
    const loadGeo = async () => {
      try {
        const [zonesRes, wardsRes] = await Promise.all([GeoApi.list("ZONE"), GeoApi.list("WARD")]);
        setZones((zonesRes.nodes || []).map((z: any) => ({ id: z.id, name: z.name })));
        setWards((wardsRes.nodes || []).map((w: any) => ({ id: w.id, name: w.name, parentId: w.parentId || null })));
      } catch {
        setError("Failed to load geo data");
      }
    };
    loadGeo();
  }, []);

  const filteredWards = useMemo(
    () => wards.filter((w) => !form.zoneId || (w.parentId && w.parentId === form.zoneId)),
    [wards, form.zoneId]
  );

  const fetchLocation = () => {
    setLocFetching(true);
    setError("");
    setStatus("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      setLocFetching(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude)
        }));
        setLocFetching(false);
      },
      (err) => {
        setError(err.message || "Failed to fetch location");
        setLocFetching(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const canSubmit = form.areaName && form.locationName && form.roadType && form.latitude && form.longitude;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("Submitting...");
    setError("");
    try {
      await TwinbinApi.requestBin({
        zoneId: form.zoneId || undefined,
        wardId: form.wardId || undefined,
        areaType: form.areaType as any,
        areaName: form.areaName,
        locationName: form.locationName,
        roadType: form.roadType,
        isFixedProperly: form.isFixedProperly,
        hasLid: form.hasLid,
        condition: form.condition as any,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude)
      });
      setStatus("Request submitted");
      window.location.href = "/modules/twinbin/my-requests";
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit";
      setError(msg);
      setStatus("");
    }
  };

  const update = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE"]}>
        <div className="content">
          <header className="mb-6">
            <p className="eyebrow">Module · Litter Bins</p>
            <h1>Register Litter Bin</h1>
            <p className="muted">Fill in the details to register a new bin.</p>
          </header>

          <form className="grid gap-6 max-w-2xl" onSubmit={submit}>
            <div className="card form">
              <h3>Location Details</h3>

              <div className="form-field">
                <label>Area Name</label>
                <input
                  className="input"
                  value={form.areaName}
                  onChange={(e) => update("areaName", e.target.value)}
                  placeholder="e.g. Central Park Gate 1"
                  required
                />
              </div>

              <div className="form-field">
                <label>Location Name</label>
                <input
                  className="input"
                  value={form.locationName}
                  onChange={(e) => update("locationName", e.target.value)}
                  placeholder="e.g. Near Bus Stop"
                  required
                />
              </div>

              <div className="form-field">
                <label>Road Type</label>
                <input
                  className="input"
                  value={form.roadType}
                  onChange={(e) => update("roadType", e.target.value)}
                  placeholder="e.g. Main Road"
                  required
                />
              </div>

              <div className="form-field">
                <label>Area Type</label>
                <div className="pill-grid">
                  {["RESIDENTIAL", "COMMERCIAL", "SLUM"].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`pill ${form.areaType === type ? 'pill-active' : ''}`}
                      onClick={() => update("areaType", type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card form">
              <h3>Geography</h3>
              <div className="grid grid-2">
                <div className="form-field">
                  <label>Zone (Optional)</label>
                  <select className="select" value={form.zoneId} onChange={(e) => update("zoneId", e.target.value)}>
                    <option value="">Select zone...</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Ward (Optional)</label>
                  <select className="select" value={form.wardId} onChange={(e) => update("wardId", e.target.value)}>
                    <option value="">Select ward...</option>
                    {filteredWards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card form">
              <h3>Status & Condition</h3>
              <div className="grid grid-2">
                <label className="checkbox p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.isFixedProperly} onChange={(e) => update("isFixedProperly", e.target.checked)} />
                  Is fixed properly?
                </label>
                <label className="checkbox p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.hasLid} onChange={(e) => update("hasLid", e.target.checked)} />
                  Has lid?
                </label>
              </div>

              <div className="form-field mt-4">
                <label>Condition</label>
                <div className="pill-grid">
                  {["GOOD", "DAMAGED"].map(cond => (
                    <button
                      key={cond}
                      type="button"
                      className={`pill ${form.condition === cond ? 'pill-active' : ''}`}
                      onClick={() => update("condition", cond)}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card form">
              <div className="flex justify-between items-center mb-2">
                <h3>GPS Coordinates</h3>
                {form.latitude && <span className="badge badge-success">Location set</span>}
              </div>

              <div className="grid grid-2">
                <div className="form-field">
                  <label>Latitude</label>
                  <input className="input bg-slate-50" value={form.latitude} readOnly placeholder="Lat" />
                </div>
                <div className="form-field">
                  <label>Longitude</label>
                  <input className="input bg-slate-50" value={form.longitude} readOnly placeholder="Lng" />
                </div>
              </div>

              <button type="button" className="btn btn-secondary w-full" onClick={fetchLocation} disabled={locFetching}>
                {locFetching ? "Fetching..." : "📍 Fetch Live Location"}
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {status && <div className="alert alert-success">{status}</div>}

            <div className="flex gap-4">
              <button className="btn btn-primary flex-1" type="submit" disabled={!canSubmit}>
                Submit Request
              </button>
            </div>
          </form>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
