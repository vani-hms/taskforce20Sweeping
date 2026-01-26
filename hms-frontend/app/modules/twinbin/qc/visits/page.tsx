'use client';

import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

export default function TwinbinQcVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [qcRemark, setQcRemark] = useState("");
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TwinbinApi.pendingVisits();
      setVisits(res.visits || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load pending visits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setActionError("");
    try {
      await TwinbinApi.approveVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to approve");
    }
  };

  const reject = async (id: string) => {
    setActionError("");
    try {
      await TwinbinApi.rejectVisit(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to reject");
    }
  };

  const actionRequired = async (id: string) => {
    if (!qcRemark.trim()) {
      setActionError("QC remark is required for action.");
      return;
    }
    setMarking(true);
    setActionError("");
    try {
      await TwinbinApi.markActionRequired(id, { qcRemark });
      setVisits((prev) => prev.filter((v) => v.id !== id));
      setReviewId(null);
      setQcRemark("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to set action required");
    } finally {
      setMarking(false);
    }
  };

  const activeVisit = reviewId ? visits.find((v) => v.id === reviewId) || null : null;

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["QC"]}>
        <div className="page">
          <h1>Twinbin - Visit Reports (Pending QC)</h1>
          {error && <div className="alert error">{error}</div>}
          {actionError && <div className="alert error">{actionError}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : visits.length === 0 ? (
            <div className="muted">No pending visit reports.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Employee</div>
                <div>Bin</div>
                <div>Submitted</div>
                <div>Distance</div>
                <div>Actions</div>
              </div>
              {visits.map((v) => (
                <div className="table-row" key={v.id}>
                  <div>{v.submittedBy?.name || v.submittedById}</div>
                  <div>
                    {v.bin?.areaName} / {v.bin?.locationName}
                  </div>
                  <div>{new Date(v.createdAt).toLocaleString()}</div>
                  <div>{v.distanceMeters ? `${v.distanceMeters.toFixed(1)} m` : "-"}</div>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => setReviewId(v.id)}>
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeVisit && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="flex space-between" style={{ marginBottom: 8 }}>
                <h3>Visit Detail</h3>
                <button className="icon-button" onClick={() => setReviewId(null)}>
                  x
                </button>
              </div>
              <p className="muted">Distance: {activeVisit.distanceMeters ? `${activeVisit.distanceMeters.toFixed(1)} m` : "-"}</p>
              <p className="muted">Bin: {activeVisit.bin?.areaName} / {activeVisit.bin?.locationName}</p>
              <p className="muted">Submitted: {new Date(activeVisit.createdAt).toLocaleString()}</p>
              <div className="grid grid-2" style={{ gap: 12 }}>
                {Object.entries(activeVisit.inspectionAnswers || {}).map(([key, val]: any) => (
                  <div key={key} className="card" style={{ padding: 10, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{questionText(key)}</div>
                    <div className="muted">Answer: {val?.answer || "-"}</div>
                    {val?.photoUrl ? (
                      <a className="link" href={val.photoUrl} target="_blank" rel="noreferrer">
                        View Photo
                      </a>
                    ) : (
                      <div className="muted">No photo</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label>QC Remark (for action required)</label>
                <textarea
                  value={qcRemark}
                  onChange={(e) => setQcRemark(e.target.value)}
                  rows={3}
                  placeholder="Enter remark for action officer"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}
                />
              </div>
              <div className="flex gap-2" style={{ marginTop: 12 }}>
                <button className="btn btn-danger" onClick={() => reject(activeVisit.id)}>
                  Reject
                </button>
                <button className="btn btn-secondary" onClick={() => actionRequired(activeVisit.id)} disabled={marking}>
                  {marking ? "Marking..." : "Action Required"}
                </button>
                <button className="btn btn-primary" onClick={() => approve(activeVisit.id)}>
                  Approve
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
