'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Bin = {
  id: string;
  areaName: string;
  areaType: string;
  locationName: string;
  roadType: string;
  isFixedProperly: boolean;
  hasLid: boolean;
  condition: string;
  latitude?: number;
  longitude?: number;
  status: string;
  createdAt: string;
  latestReport?: { status: string } | null;
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

export default function AssignedBinDetailPage() {
  const params = useParams();
  const binId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [bin, setBin] = useState<Bin | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const questions = [
    "Are adequate litter bins provided in the area?",
    "Are the litter bins properly fixed and securely installed?",
    "Are the litter bins provided with lids/covers?",
    "Is the ULB/Municipal logo or code clearly displayed?",
    "Is waste found scattered around the litter bins?",
    "Are any litter bins damaged or in poor condition?",
    "Is an animal-proof locking mechanism provided?",
    "Are the litter bins easily accessible to the public?",
    "Are the litter bins being used properly by citizens?",
    "Are the litter bins regularly cleaned and maintained?"
  ];
  const [answers, setAnswers] = useState<Record<string, { answer: "YES" | "NO" | ""; photoUrl: string }>>(
    Object.fromEntries(questions.map((_, idx) => [`q${idx + 1}`, { answer: "", photoUrl: "" }]))
  );
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!binId) return;
      setLoading(true);
      setError("");
      try {
        const res = await TwinbinApi.assigned();
        const found = (res.bins || []).find((b: any) => b.id === binId);
        if (!found) {
          setError("Bin not found or not assigned to you.");
        } else {
          setBin(found);
          setReportStatus(found.latestReport?.status || null);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load bin");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [binId]);

  const fetchLocation = () => {
    if (!bin || !bin.latitude || !bin.longitude) {
      setLocError("Bin location unavailable");
      return;
    }
    setLocError("");
    setStatusMsg("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = haversineMeters(latitude, longitude, bin.latitude!, bin.longitude!);
        setDistance(dist);
        setMyLat(latitude);
        setMyLng(longitude);
      },
      (err) => setLocError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const withinFence = useMemo(() => (distance !== null ? distance <= 50 : false), [distance]);

  const setAnswer = (key: string, answer: "YES" | "NO") => {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], answer } }));
  };

  const onFileChange = async (key: string, file?: File) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], photoUrl: dataUrl } }));
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!withinFence || !bin || myLat === null || myLng === null) return;
    const incomplete = Object.entries(answers).find(([, v]) => !v.answer || !v.photoUrl);
    if (incomplete) {
      setSubmitError("All answers and photos are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setStatusMsg("");
    try {
      const questionnaire = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, { answer: v.answer as "YES" | "NO", photoUrl: v.photoUrl }])
      );
      const res = await TwinbinApi.submitReport(bin.id, {
        latitude: myLat,
        longitude: myLng,
        questionnaire
      });
      setStatusMsg("Report submitted, awaiting QC review.");
      setReportStatus(res.report?.status || "SUBMITTED");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE"]}>
        <div className="page">
          <h1>Twinbin Bin Detail</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : !bin ? (
            <div className="muted">No bin found.</div>
          ) : (
            <div className="card">
              <div className="grid grid-2">
                <Field label="Area Name" value={bin.areaName} />
                <Field label="Area Type" value={bin.areaType} />
                <Field label="Location Name" value={bin.locationName} />
                <Field label="Road Type" value={bin.roadType} />
                <Field label="Fixed Properly" value={bin.isFixedProperly ? "Yes" : "No"} />
                <Field label="Has Lid" value={bin.hasLid ? "Yes" : "No"} />
                <Field label="Condition" value={bin.condition} />
                <Field label="Latitude" value={bin.latitude?.toString() || "-"} />
                <Field label="Longitude" value={bin.longitude?.toString() || "-"} />
                <Field label="Created" value={new Date(bin.createdAt).toLocaleString()} />
              </div>

              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={fetchLocation}>
                  Fetch My Location
                </button>
                <div className="muted">
                  {distance === null ? "Distance not calculated" : `Distance: ${distance.toFixed(1)} m`}
                </div>
              </div>
              {locError && <div className="alert error">{locError}</div>}
              <div className="muted" style={{ marginTop: 8 }}>
                {withinFence
                  ? "You are within 50 meters. You can submit a report."
                  : "You must be within 50 meters to submit a report."}
              </div>
              <div className="form-grid" style={{ marginTop: 16 }}>
                {questions.map((text, idx) => {
                  const key = `q${idx + 1}`;
                  const value = answers[key];
                  return (
                    <div key={key} className="card" style={{ padding: 12, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>{text}</div>
                      <div className="flex gap-2" style={{ marginBottom: 8 }}>
                        <label className="checkbox">
                          <input
                            type="radio"
                            name={key}
                            checked={value.answer === "YES"}
                            onChange={() => setAnswer(key, "YES")}
                          />{" "}
                          Yes
                        </label>
                        <label className="checkbox">
                          <input
                            type="radio"
                            name={key}
                            checked={value.answer === "NO"}
                            onChange={() => setAnswer(key, "NO")}
                          />{" "}
                          No
                        </label>
                      </div>
                      <label className="btn btn-secondary btn-sm" style={{ display: "inline-block" }}>
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => onFileChange(key, e.target.files?.[0])}
                        />
                      </label>
                      {value.photoUrl ? (
                        <div style={{ marginTop: 8 }}>
                          <img src={value.photoUrl} alt="upload preview" style={{ maxHeight: 120, borderRadius: 6 }} />
                        </div>
                      ) : (
                        <div className="muted" style={{ marginTop: 4 }}>
                          Photo required
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {submitError && <div className="alert error" style={{ marginTop: 8 }}>{submitError}</div>}
              {statusMsg && <div className="alert success" style={{ marginTop: 8 }}>{statusMsg}</div>}
              {reportStatus && (
                <div className="badge" style={{ marginTop: 8 }}>
                  Report Status: {reportStatus.replace("_", " ")}
                </div>
              )}
              <button
                className="btn btn-primary"
                disabled={!withinFence || submitting}
                onClick={handleSubmit}
                style={{ marginTop: 12 }}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
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
