'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, GeoApi, TaskforceApi } from "@lib/apiClient";

type FeederPoint = {
  id: string;
  feederPointName: string;
  areaName: string;
  areaType: string;
  locationDescription: string;
  latitude?: number;
  longitude?: number;
  zoneId?: string | null;
  wardId?: string | null;
  status: string;
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TaskforceAssignedDetailPage() {
  const params = useParams();
  const router = useRouter();
  const feederId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [feeder, setFeeder] = useState<FeederPoint | null>(null);
  const [zones, setZones] = useState<Record<string, string>>({});
  const [wards, setWards] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState("");
  const watchId = useRef<number | null>(null);

  const [notes, setNotes] = useState("");
  const [issuesFound, setIssuesFound] = useState<"YES" | "NO" | "">("");
  const [submitError, setSubmitError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!feederId) return;
      setLoading(true);
      setError("");
      try {
        const [assignedRes, zoneRes, wardRes] = await Promise.all([
          TaskforceApi.assigned(),
          GeoApi.list("ZONE"),
          GeoApi.list("WARD")
        ]);
        const found = (assignedRes.feederPoints || []).find((f: any) => f.id === feederId);
        if (!found) {
          setError("Feeder point not found or not assigned to you.");
        } else {
          setFeeder(found);
        }
        setZones(Object.fromEntries((zoneRes.nodes || []).map((n: any) => [n.id, n.name])));
        setWards(Object.fromEntries((wardRes.nodes || []).map((n: any) => [n.id, n.name])));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load feeder point");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [feederId]);

  useEffect(() => {
    if (!feeder || !feeder.latitude || !feeder.longitude) return;
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported by this browser.");
      return;
    }
    setLocError("");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyCoords({ lat: latitude, lng: longitude });
        const dist = haversineMeters(latitude, longitude, feeder.latitude!, feeder.longitude!);
        setDistance(dist);
      },
      (err) => setLocError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [feeder]);

  const withinFence = useMemo(() => (distance !== null ? distance <= 100 : false), [distance]);

  const handleSubmit = async () => {
    if (!feeder || !myCoords) return;
    if (!withinFence) {
      setSubmitError("Move within 100m to submit.");
      return;
    }
    if (!issuesFound) {
      setSubmitError("Please select whether issues were found.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setSubmitStatus("");
    try {
      await TaskforceApi.submitReport(feeder.id, {
        latitude: myCoords.lat,
        longitude: myCoords.lng,
        payload: { notes, issuesFound }
      });
      setSubmitStatus("Report submitted for QC review.");
      setNotes("");
      setIssuesFound("");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE"]}>
        <div className="page">
          <div className="flex gap-2" style={{ alignItems: "center" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => router.back()}>
              ← Back
            </button>
            <h1 style={{ margin: 0 }}>Feeder Point</h1>
          </div>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : !feeder ? (
            <div className="muted">No feeder point found.</div>
          ) : (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="grid grid-2">
                <Field label="Name" value={feeder.feederPointName} />
                <Field label="Area" value={`${feeder.areaName} (${feeder.areaType})`} />
                <Field label="Location" value={feeder.locationDescription} />
                <Field label="Zone" value={(feeder.zoneId && zones[feeder.zoneId]) || "-"} />
                <Field label="Ward" value={(feeder.wardId && wards[feeder.wardId]) || "-"} />
                <Field label="Latitude" value={feeder.latitude?.toString() || "-"} />
                <Field label="Longitude" value={feeder.longitude?.toString() || "-"} />
                <Field label="Status" value={feeder.status} />
              </div>

              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                <div className="flex gap-2" style={{ alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>Distance to feeder</div>
                    <div className="muted">
                      {distance === null ? "Fetching location..." : `${distance.toFixed(1)} meters`}
                    </div>
                  </div>
                  {!withinFence && (
                    <span className="badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                      Outside 100m
                    </span>
                  )}
                </div>
                {locError && <div className="alert error" style={{ marginTop: 8 }}>{locError}</div>}
              </div>

              <div className="card" style={{ marginTop: 12 }}>
                <h3>Submit Daily Report</h3>
                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Issues found?
                </label>
                <div className="flex gap-3" style={{ marginBottom: 12 }}>
                  <label className="checkbox">
                    <input
                      type="radio"
                      checked={issuesFound === "YES"}
                      onChange={() => setIssuesFound("YES")}
                      name="issuesFound"
                    />{" "}
                    Yes
                  </label>
                  <label className="checkbox">
                    <input
                      type="radio"
                      checked={issuesFound === "NO"}
                      onChange={() => setIssuesFound("NO")}
                      name="issuesFound"
                    />{" "}
                    No
                  </label>
                </div>

                <label className="muted" style={{ display: "block", marginBottom: 4 }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter short notes"
                  rows={3}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #e2e8f0" }}
                />

                {submitError && <div className="alert error" style={{ marginTop: 8 }}>{submitError}</div>}
                {submitStatus && <div className="alert success" style={{ marginTop: 8 }}>{submitStatus}</div>}

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  disabled={!withinFence || submitting || !feeder.latitude || !feeder.longitude}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting..." : withinFence ? "Submit Report" : "Move within 100m to submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label>{label}</label>
      <div className="muted">{value}</div>
    </div>
  );
}
