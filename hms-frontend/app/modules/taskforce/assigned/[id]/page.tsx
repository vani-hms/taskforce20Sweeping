'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  assignedAt?: string;
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

  const [q, setQ] = useState({
    wastePresent: "" as "YES" | "NO" | "",
    segregationNotes: "",
    insidePhotos: [""],
    outsideWaste: "" as "YES" | "NO" | "",
    outsidePhotos: [""],
    cleanRemark: "",
    workersPresent: "" as "YES" | "NO" | "",
    workerCount: "",
    workerNames: "",
    workersPhoto: "",
    vehiclePresent: "" as "YES" | "NO" | "",
    vehicleNumber: "",
    vehicleHelper: "",
    vehiclePhoto: "",
    surroundingCleanPhotos: ["", "", ""],
    swdClean: "" as "YES" | "NO" | "",
    swdPhotos: [""],
    signboardVisible: "" as "YES" | "NO" | "",
    signboardPhoto: "",
    signboardRemark: "",
    thirdPartyDumping: "" as "YES" | "NO" | "",
    dumpingPhoto: "",
    leachateVisible: "" as "YES" | "NO" | "",
    leachatePhoto: "",
    strayAnimals: "" as "YES" | "NO" | "",
    strayAnimalsPhoto: ""
  });
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

  const setField = (field: keyof typeof q, value: any) => setQ((prev) => ({ ...prev, [field]: value }));
  const setPhoto = (field: keyof typeof q, idx: number, value: string) =>
    setQ((prev) => {
      const arr = [...(prev[field] as string[])];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });

  const requireField = (condition: any, message: string) => {
    if (!condition) {
      setSubmitError(message);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!feeder || !myCoords) return;
    setSubmitError("");
    setSubmitStatus("");
    if (!withinFence) {
      setSubmitError("Move within 100m to submit.");
      return;
    }

    if (!requireField(q.wastePresent, "Q1: select waste presence")) return;
    if (q.wastePresent === "YES" && !q.insidePhotos[0]) return setSubmitError("Q1: add inside waste photo");
    if (q.wastePresent === "YES" && q.outsideWaste === "YES" && !q.outsidePhotos[0])
      return setSubmitError("Q1: add outside waste photo");
    if (q.wastePresent === "NO" && !q.cleanRemark) return setSubmitError("Q1: add clean area remark");

    if (!requireField(q.workersPresent, "Q2: select worker presence")) return;
    if (q.workersPresent === "YES" && !q.workerCount) return setSubmitError("Q2: worker count required");
    if (q.workersPresent === "YES" && !q.workerNames) return setSubmitError("Q2: worker names required");
    if (q.workersPresent === "NO" && !q.workersPhoto) return setSubmitError("Q2: upload absence photo");

    if (!requireField(q.vehiclePresent, "Q3: select vehicle presence")) return;
    if (q.vehiclePresent === "YES" && !q.vehicleNumber) return setSubmitError("Q3: vehicle number required");
    if (q.vehiclePresent === "YES" && !q.vehicleHelper) return setSubmitError("Q3: helper details required");
    if (q.vehiclePresent === "NO" && !q.vehiclePhoto) return setSubmitError("Q3: upload vehicle absence photo");

    if (q.surroundingCleanPhotos.some((p) => !p)) return setSubmitError("Q4: add 3 surrounding area photos");

    if (!requireField(q.swdClean, "Q5: SWD clean status required")) return;
    if (!q.swdPhotos[0]) return setSubmitError("Q5: SWD photo required");

    if (!requireField(q.signboardVisible, "Q6: signboard visibility required")) return;
    if (!q.signboardPhoto) return setSubmitError("Q6: signboard photo required");

    if (!requireField(q.thirdPartyDumping, "Q7: dumping observation required")) return;
    if (q.thirdPartyDumping === "YES" && !q.dumpingPhoto) return setSubmitError("Q7: dumping photo required");

    if (!requireField(q.leachateVisible, "Q8: leachate visibility required")) return;
    if (!q.leachatePhoto) return setSubmitError("Q8: leachate photo required");

    if (!requireField(q.strayAnimals, "Q9: stray animals required")) return;
    if (!q.strayAnimalsPhoto) return setSubmitError("Q9: stray animals photo required");

    setSubmitting(true);
    try {
      await TaskforceApi.submitReport(feeder.id, {
        latitude: myCoords.lat,
        longitude: myCoords.lng,
        payload: {
          q1: {
            wastePresent: q.wastePresent === "YES",
            segregationNotes: q.segregationNotes,
            insidePhotos: q.insidePhotos,
            outsideWaste: q.outsideWaste === "YES",
            outsidePhotos: q.outsidePhotos,
            cleanRemark: q.cleanRemark
          },
          q2: {
            workersPresent: q.workersPresent === "YES",
            workerCount: q.workerCount,
            workerNames: q.workerNames,
            workersPhoto: q.workersPhoto
          },
          q3: {
            vehiclePresent: q.vehiclePresent === "YES",
            vehicleNumber: q.vehicleNumber,
            vehicleHelper: q.vehicleHelper,
            vehiclePhoto: q.vehiclePhoto
          },
          q4: { surroundingCleanPhotos: q.surroundingCleanPhotos },
          q5: { swdClean: q.swdClean === "YES", swdPhotos: q.swdPhotos },
          q6: { signboardVisible: q.signboardVisible === "YES", signboardPhoto: q.signboardPhoto, signboardRemark: q.signboardRemark },
          q7: { thirdPartyDumping: q.thirdPartyDumping === "YES", dumpingPhoto: q.dumpingPhoto },
          q8: { leachateVisible: q.leachateVisible === "YES", leachatePhoto: q.leachatePhoto },
          q9: { strayAnimals: q.strayAnimals === "YES", strayAnimalsPhoto: q.strayAnimalsPhoto }
        }
      });
      setSubmitStatus("Report submitted for QC review.");
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
              <- Back
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
                <Field label="Assigned On" value={feeder.assignedAt ? new Date(feeder.assignedAt).toLocaleString() : "-"} />
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
                <h3>Taskforce Questionnaire</h3>

                <Question label="Q1. Is there any waste present at the SCP?" value={q.wastePresent} onChange={(v) => setField("wastePresent", v)} />
                {q.wastePresent === "YES" && (
                  <>
                    <Input label="Segregation / notes" value={q.segregationNotes} onChange={(e) => setField("segregationNotes", e.target.value)} />
                    <Input label="Inside waste photo URL" value={q.insidePhotos[0]} onChange={(e) => setPhoto("insidePhotos", 0, e.target.value)} />
                    <Question label="Outside waste present?" value={q.outsideWaste} onChange={(v) => setField("outsideWaste", v)} />
                    {q.outsideWaste === "YES" && (
                      <Input label="Outside waste photo URL" value={q.outsidePhotos[0]} onChange={(e) => setPhoto("outsidePhotos", 0, e.target.value)} />
                    )}
                  </>
                )}
                {q.wastePresent === "NO" && (
                  <>
                    <Input label="Area clean photo URL" value={q.insidePhotos[0]} onChange={(e) => setPhoto("insidePhotos", 0, e.target.value)} />
                    <Input label="Remark" value={q.cleanRemark} onChange={(e) => setField("cleanRemark", e.target.value)} />
                  </>
                )}

                <Question label="Q2. Are Swachh workers present?" value={q.workersPresent} onChange={(v) => setField("workersPresent", v)} />
                {q.workersPresent === "YES" && (
                  <>
                    <Input label="Worker count" value={q.workerCount} onChange={(e) => setField("workerCount", e.target.value)} />
                    <Input label="Worker names" value={q.workerNames} onChange={(e) => setField("workerNames", e.target.value)} />
                  </>
                )}
                {q.workersPresent === "NO" && (
                  <Input label="Photo (no workers present)" value={q.workersPhoto} onChange={(e) => setField("workersPhoto", e.target.value)} />
                )}

                <Question label="Q3. Is PMC waste vehicle present?" value={q.vehiclePresent} onChange={(v) => setField("vehiclePresent", v)} />
                {q.vehiclePresent === "YES" && (
                  <>
                    <Input label="Vehicle number" value={q.vehicleNumber} onChange={(e) => setField("vehicleNumber", e.target.value)} />
                    <Input label="Helper details" value={q.vehicleHelper} onChange={(e) => setField("vehicleHelper", e.target.value)} />
                  </>
                )}
                {q.vehiclePresent === "NO" && (
                  <Input label="Photo (vehicle not present)" value={q.vehiclePhoto} onChange={(e) => setField("vehiclePhoto", e.target.value)} />
                )}

                <label className="muted" style={{ display: "block", marginTop: 12 }}>
                  Q4. Surrounding area (30m) clean? Upload 3 photos
                </label>
                {q.surroundingCleanPhotos.map((p, idx) => (
                  <Input key={idx} label={`Photo ${idx + 1}`} value={p} onChange={(e) => setPhoto("surroundingCleanPhotos", idx, e.target.value)} />
                ))}

                <Question label="Q5. Is SWD clean?" value={q.swdClean} onChange={(v) => setField("swdClean", v)} />
                <Input label="SWD photo URL" value={q.swdPhotos[0]} onChange={(e) => setPhoto("swdPhotos", 0, e.target.value)} />

                <Question label="Q6. Is SCP signboard/QR visible?" value={q.signboardVisible} onChange={(v) => setField("signboardVisible", v)} />
                <Input label="Signboard/QR photo URL" value={q.signboardPhoto} onChange={(e) => setField("signboardPhoto", e.target.value)} />
                <Input label="Remarks" value={q.signboardRemark} onChange={(e) => setField("signboardRemark", e.target.value)} />

                <Question label="Q7. Third-party dumping observed?" value={q.thirdPartyDumping} onChange={(v) => setField("thirdPartyDumping", v)} />
                {q.thirdPartyDumping === "YES" && (
                  <Input label="Dumping photo URL" value={q.dumpingPhoto} onChange={(e) => setField("dumpingPhoto", e.target.value)} />
                )}

                <Question label="Q8. Leachate visible?" value={q.leachateVisible} onChange={(v) => setField("leachateVisible", v)} />
                <Input label="Leachate photo URL" value={q.leachatePhoto} onChange={(e) => setField("leachatePhoto", e.target.value)} />

                <Question label="Q9. Stray animals present?" value={q.strayAnimals} onChange={(v) => setField("strayAnimals", v)} />
                <Input label="Stray animals photo URL" value={q.strayAnimalsPhoto} onChange={(e) => setField("strayAnimalsPhoto", e.target.value)} />

                {submitError && <div className="alert error" style={{ marginTop: 8 }}>{submitError}</div>}
                {submitStatus && <div className="alert success" style={{ marginTop: 8 }}>{submitStatus}</div>}

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  disabled={!withinFence || submitting || !feeder.latitude || !feeder.longitude}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting..." : withinFence ? "Submit for QC" : "Move within 100m to submit"}
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

function Input({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <label className="muted" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        className="input input-bordered w-full"
        placeholder="Enter text or photo URL"
      />
    </div>
  );
}

function Question({
  label,
  value,
  onChange
}: {
  label: string;
  value: "YES" | "NO" | "";
  onChange: (v: "YES" | "NO") => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label className="muted" style={{ display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <div className="flex gap-3">
        <label className="checkbox">
          <input type="radio" checked={value === "YES"} onChange={() => onChange("YES")} /> Yes
        </label>
        <label className="checkbox">
          <input type="radio" checked={value === "NO"} onChange={() => onChange("NO")} /> No
        </label>
      </div>
    </div>
  );
}
