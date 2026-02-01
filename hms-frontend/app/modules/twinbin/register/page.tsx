'use client';

import { useEffect, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, AuthApi, PublicGeoApi, TwinbinApi } from "@lib/apiClient";

type GeoNode = { id: string; name: string };

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
    const loadCityAndZones = async () => {
      try {
        const { user } = await AuthApi.getMe();

        // Find LITTERBINS module to get scope and correct cityId
        const module = user.modules?.find((m: any) => m.key === "LITTERBINS" || m.name === "LITTERBINS");

        // Prefer module's cityId if available (from our backend update), fallback to user.cityId
        // The user.cityId might be undefined for QC/Taskforce in some contexts, so module.cityId is safer.
        const effectiveCityId = module?.cityId || user.cityId;
        console.log("EFFECTIVE CITY ID", effectiveCityId, "MODULE FOUND", !!module);

        if (effectiveCityId) {
          const { zones } = await PublicGeoApi.zones(effectiveCityId);
          console.log("ALL ZONES FETCHED", zones.length);

          // Apply scope filtering: if module has zoneIds, only show those.
          // If zoneIds is empty/null, it means NO Restriction (ALL zones in city).
          const scopedZones = (module?.zoneIds?.length)
            ? zones.filter(z => module.zoneIds.includes(z.id))
            : zones;

          console.log("SCOPED ZONES", scopedZones.length);
          setZones(scopedZones || []);
        } else {
          console.error("No City ID found in user or module scope");
          setError("Could not determine city context. Please contact support.");
        }
      } catch (err: any) {
        console.error("Failed to load geo data", err);
        setError("Failed to load geo data: " + (err.message || "Unknown error"));
      }
    };
    loadCityAndZones();
  }, []);

  const handleZoneChange = async (zoneId: string) => {
    update("zoneId", zoneId);
    update("wardId", ""); // Reset ward
    setWards([]);

    if (zoneId) {
      try {
        const { wards } = await PublicGeoApi.wards(zoneId);
        setWards(wards || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

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

  const canSubmit =
    form.areaName &&
    form.locationName &&
    form.roadType &&
    form.latitude &&
    form.longitude &&
    form.zoneId &&
    form.wardId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.zoneId || !form.wardId) {
      setError("Zone and Ward are required");
      return;
    }

    if (!canSubmit) return;
    setStatus("Submitting...");
    setError("");
    try {
      await TwinbinApi.requestBin({
        zoneId: form.zoneId,
        wardId: form.wardId,
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
                  <label>Zone <span className="text-red-500">*</span></label>
                  <select
                    className="select"
                    value={form.zoneId}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    required
                  >
                    <option value="">Select zone...</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Ward <span className="text-red-500">*</span></label>
                  <select
                    className="select"
                    value={form.wardId}
                    onChange={(e) => update("wardId", e.target.value)}
                    disabled={!form.zoneId}
                    required
                  >
                    <option value="">Select ward...</option>
                    {wards.map((w) => (
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
