'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

export default function TwinbinActionRequiredDetailPage() {
  const params = useParams();
  const router = useRouter();
  const visitId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [visit, setVisit] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState("");
  const [photo, setPhoto] = useState<string>("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!visitId) return;
      setLoading(true);
      setError("");
      try {
        const res = await TwinbinApi.listActionRequired();
        const found = (res.visits || []).find((v: any) => v.id === visitId);
        if (!found) setError("Visit not found or already handled.");
        else setVisit(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load visit");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [visitId]);

  const submit = async () => {
    if (!visit) return;
    if (!remark.trim() || !photo) {
      setActionError("Remark and photo are required.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      await TwinbinApi.submitActionTaken(visit.id, { actionRemark: remark, actionPhotoUrl: photo });
      router.push("/modules/twinbin/action-required");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit action");
    } finally {
      setSubmitting(false);
    }
  };

  const onFileChange = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["ACTION_OFFICER"]}>
        <div className="page">
          <h1>Action Required - Twinbin</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : !visit ? (
            <div className="muted">No visit found.</div>
          ) : (
            <div className="card">
              <p className="muted">
                Bin: {visit.bin?.areaName} / {visit.bin?.locationName}
              </p>
              <p className="muted">QC Remark: {visit.qcRemark || "-"}</p>
              <div className="grid grid-2" style={{ gap: 12 }}>
                {(visit.inspectionAnswers ? Object.entries(visit.inspectionAnswers) : []).map(([key, val]: any) => (
                  <div key={key} className="card" style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{questionText(key)}</div>
                    <div className="muted">Answer: {val?.answer || "-"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label>Action Remark</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  placeholder="Describe the action taken"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="btn btn-secondary btn-sm" style={{ display: "inline-block" }}>
                  Upload Action Photo
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onFileChange(e.target.files?.[0])} />
                </label>
                {photo ? <img src={photo} alt="action" style={{ maxHeight: 160, marginTop: 8, borderRadius: 8 }} /> : <p className="muted">Photo required</p>}
              </div>
              {actionError && <div className="alert error" style={{ marginTop: 8 }}>{actionError}</div>}
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => router.push("/modules/twinbin/action-required")}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Action"}
                </button>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function questionText(key: string) {
  const map: Record<string, string> = {
    q1: "Are adequate litter bins provided in the area?",
    q2: "Are the litter bins properly fixed and securely installed?",
    q3: "Are the litter bins provided with lids/covers?",
    q4: "Is the ULB/Municipal logo or code clearly displayed?",
    q5: "Is waste found scattered around the litter bins?",
    q6: "Are any litter bins damaged or in poor condition?",
    q7: "Is an animal-proof locking mechanism provided?",
    q8: "Are the litter bins easily accessible to the public?",
    q9: "Are the litter bins being used properly by citizens?",
    q10: "Are the litter bins regularly cleaned and maintained?"
  };
  return map[key] || key;
}
