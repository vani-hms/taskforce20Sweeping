'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Bin = {
  id: string;
  areaName: string;
  areaType?: string;
  locationName: string;
  roadType?: string;
  isFixedProperly?: boolean;
  hasLid?: boolean;
  condition?: string;
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
  const [proximityToken, setProximityToken] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [ctxMsg, setCtxMsg] = useState<string | null>(null);
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
          const latestReport = (found as any).latestReport;
          setReportStatus(latestReport?.status || null);
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
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMyLat(latitude);
        setMyLng(longitude);
        try {
          const ctx = await TwinbinApi.reportContext(bin.id, latitude, longitude);
          setDistance(ctx.distanceMeters);
          setAllowed(ctx.allowed);
          setProximityToken(ctx.proximityToken);
          setCtxMsg(ctx.message || null);
          setLocError(ctx.allowed ? "" : ctx.message || "Move closer to submit.");
        } catch (err: any) {
          setAllowed(false);
          setProximityToken(null);
          setCtxMsg("Failed to verify distance.");
          setLocError(err instanceof ApiError ? err.message : "Failed to verify distance");
        }
      },
      (err) => setLocError(err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const withinFence = useMemo(() => allowed && distance !== null && distance <= 50, [allowed, distance]);

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
    if (!withinFence || !bin || myLat === null || myLng === null || !proximityToken) return;
    const incomplete = Object.entries(answers).find(([, v]) => !v.answer);
    if (incomplete) {
      setSubmitError("All answers are required (photos optional).");
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
        questionnaire,
        proximityToken
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
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE"]}>
        <div className="content">
          <header className="mb-6">
            <p className="eyebrow">Litter Bins</p>
            <h1>Bin Detail</h1>
            <p className="muted">Verify location and submit bin inspection report.</p>
          </header>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          {loading ? (
            <div className="card p-8 text-center muted">Loading...</div>
          ) : !bin ? (
            <div className="card p-8 text-center muted">Bin not found.</div>
          ) : (
            <div className="grid gap-6 max-w-3xl">
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <h3>Bin Information</h3>
                  {reportStatus && <div className="badge badge-info">{reportStatus.replace(/_/g, " ")}</div>}
                </div>

                <div className="grid grid-2 gap-y-4">
                  <Field label="Area Name" value={bin.areaName} />
                  <Field label="Location" value={bin.locationName} />
                  <Field label="Type" value={`${bin.areaType || '-'} / ${bin.roadType || '-'}`} />
                  <Field label="Condition" value={bin.condition || "-"} />
                  <Field label="Fixed Properly" value={bin.isFixedProperly ? "Yes" : "No"} />
                  <Field label="Has Lid" value={bin.hasLid ? "Yes" : "No"} />
                </div>
              </div>

              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h3>Location Verification</h3>
                  {withinFence && <span className="badge badge-success">Within Range</span>}
                </div>

                <p className="muted text-sm mb-4">
                  You must be within 50 meters of the bin to submit a report.
                  {distance !== null && <span className="font-bold ml-2">Current Distance: {distance.toFixed(1)}m</span>}
                </p>

                <div className="flex gap-3 mb-4">
                  <button className="btn btn-secondary" onClick={fetchLocation} disabled={loading}>
                    📍 Check My Location
                  </button>
                </div>

                {locError && <div className="alert alert-error">{locError}</div>}
                {!withinFence && ctxMsg && <div className="alert alert-info">{ctxMsg}</div>}
              </div>

              {withinFence && (
                <div className="card">
                  <h3>Inspection Checklist</h3>
                  <p className="muted text-sm mb-6">Answer all questions to submit report.</p>

                  <div className="grid gap-4">
                    {questions.map((text, idx) => {
                      const key = `q${idx + 1}`;
                      const value = answers[key];
                      return (
                        <div key={key} className="p-4 border rounded-lg bg-slate-50">
                          <div className="font-medium mb-3">{text}</div>
                          <div className="flex gap-4 mb-3">
                            <label className={`pill cursor-pointer ${value.answer === 'YES' ? 'pill-active ring-1 ring-blue-500' : ''}`}>
                              <input
                                type="radio"
                                name={key}
                                className="hidden"
                                checked={value.answer === "YES"}
                                onChange={() => setAnswer(key, "YES")}
                              />
                              Yes
                            </label>
                            <label className={`pill cursor-pointer ${value.answer === 'NO' ? 'pill-active ring-1 ring-blue-500' : ''}`}>
                              <input
                                type="radio"
                                name={key}
                                className="hidden"
                                checked={value.answer === "NO"}
                                onChange={() => setAnswer(key, "NO")}
                              />
                              No
                            </label>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="btn btn-sm btn-secondary cursor-pointer">
                              {value.photoUrl ? "Change Photo" : "Add Photo"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => onFileChange(key, e.target.files?.[0])}
                              />
                            </label>
                            {value.photoUrl && <span className="text-xs text-green-700 font-medium">Photo added</span>}
                          </div>
                          {value.photoUrl && (
                            <img src={value.photoUrl} alt="Evidence" className="mt-3 rounded-lg h-32 object-cover border" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {submitError && <div className="alert alert-error mt-4">{submitError}</div>}
                  {statusMsg && <div className="alert alert-success mt-4">{statusMsg}</div>}

                  <div className="mt-6 pt-6 border-t">
                    <button
                      className="btn btn-primary w-full"
                      disabled={!withinFence || submitting || !proximityToken}
                      onClick={handleSubmit}
                    >
                      {submitting ? "Submitting Report..." : "Submit Inspection Report"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wider muted">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
