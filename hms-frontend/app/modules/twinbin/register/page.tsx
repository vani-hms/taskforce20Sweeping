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
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE"]}>
        <div className="page">
          <h1>Register Litter Bin</h1>
          <form className="form card" onSubmit={submit}>
            <div className="grid grid-2">
              <div>
                <label>Zone (optional)</label>
                <select className="input" value={form.zoneId} onChange={(e) => update("zoneId", e.target.value)}>
                  <option value="">Select zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Ward (optional)</label>
                <select className="input" value={form.wardId} onChange={(e) => update("wardId", e.target.value)}>
                  <option value="">Select ward</option>
                  {filteredWards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label>Area Type</label>
            <select className="input" value={form.areaType} onChange={(e) => update("areaType", e.target.value)}>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="SLUM">Slum</option>
            </select>

            <label>Area Name</label>
            <input className="input" value={form.areaName} onChange={(e) => update("areaName", e.target.value)} required />

            <label>Location Name</label>
            <input
              className="input"
              value={form.locationName}
              onChange={(e) => update("locationName", e.target.value)}
              required
            />

            <label>Road Type</label>
            <input className="input" value={form.roadType} onChange={(e) => update("roadType", e.target.value)} required />

            <div className="grid grid-2">
              <label className="checkbox">
                <input type="checkbox" checked={form.isFixedProperly} onChange={(e) => update("isFixedProperly", e.target.checked)} />{" "}
                Is bin fixed properly?
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={form.hasLid} onChange={(e) => update("hasLid", e.target.checked)} /> Has lid?
              </label>
            </div>

            <label>Condition</label>
            <select className="input" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
              <option value="GOOD">Good</option>
              <option value="DAMAGED">Damaged</option>
            </select>

            <div className="grid grid-2" style={{ alignItems: "center" }}>
              <div>
                <label>Latitude</label>
                <input className="input" value={form.latitude} readOnly />
              </div>
              <div>
                <label>Longitude</label>
                <input className="input" value={form.longitude} readOnly />
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchLocation} disabled={locFetching}>
              {locFetching ? "Fetching location..." : "📍 Fetch Live Location"}
            </button>

            {error && <div className="alert error">{error}</div>}
            {status && <div className="alert success">{status}</div>}

            <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
              Submit Request
            </button>
          </form>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
