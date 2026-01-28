'use client';

import { useEffect, useMemo, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TaskforceApi } from "@lib/apiClient";

type Report = {
  id: string;
  status: string;
  createdAt: string;
  payload: any;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  feederPoint: {
    id: string;
    feederPointName: string;
    areaName: string;
    areaType: string;
    locationDescription: string;
    latitude: number;
    longitude: number;
  };
  submittedBy?: { id: string; name: string; email: string };
};

export default function TaskforceQcReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "APPROVED" | "REJECTED" | "ACTION_REQUIRED">(null);

  const active = useMemo(() => reports.find((r) => r.id === activeId) || null, [reports, activeId]);

  const questionLabels: Record<string, string> = {
    q1: "Is the site accessible?",
    q2: "Is the area clean?",
    q3: "Is signage present?",
    q4: "Is waste segregated?",
    q5: "Is safety gear used?",
    q6: "Is issue resolved?",
    q7: "Is additional manpower needed?",
    q8: "Are residents informed?",
    q9: "Is GPS accurate?",
    q10: "Any obstruction observed?"
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TaskforceApi.pendingReports();
      setReports(res.reports || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (status: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
    if (!active) return;
    setActionStatus(`Marking ${status.toLowerCase()}...`);
    setActionError("");
    try {
      if (status === "APPROVED") await TaskforceApi.approveReport(active.id);
      else if (status === "REJECTED") await TaskforceApi.rejectReport(active.id);
      else await TaskforceApi.actionRequiredReport(active.id);
      setReports((prev) => prev.filter((r) => r.id !== active.id));
      setActiveId(null);
      setActionStatus("Updated");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update");
      setActionStatus("");
    }
  };

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["QC"]}>
        <div className="page">
          <StyleInjector />
          <h1>Taskforce Reports - Pending</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="muted">No pending reports.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Feeder Point</div>
                <div>Area</div>
                <div>Employee</div>
                <div>Distance</div>
                <div>Submitted</div>
                <div>Action</div>
              </div>
              {reports.map((r) => (
                <div className="table-row" key={r.id}>
                  <div>{r.feederPoint?.feederPointName}</div>
                  <div>{r.feederPoint?.areaName}</div>
                  <div>{r.submittedBy?.name || "-"}</div>
                  <div>{r.distanceMeters?.toFixed(1)} m</div>
                  <div>{new Date(r.createdAt).toLocaleString()}</div>
                  <div>
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveId(r.id)}>
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {active && (
            <div className="modal-backdrop">
              <div className="modal">
                <div className="modal-header">
                  <h3>Report Detail</h3>
                  <button className="icon-button" onClick={() => setActiveId(null)}>
                    x
                  </button>
                </div>
                <div className="modal-body">
                  <div className="grid grid-2 detail-grid">
                    <Field label="Feeder" value={active.feederPoint?.feederPointName} />
                    <Field label="Area" value={active.feederPoint?.areaName} />
                    <Field label="Area Type" value={active.feederPoint?.areaType} />
                    <Field label="Location" value={active.feederPoint?.locationDescription} />
                    <Field label="Employee" value={active.submittedBy?.name || "-"} />
                    <Field label="Distance" value={`${active.distanceMeters?.toFixed(1)} m`} />
                    <Field label="Submitted At" value={new Date(active.createdAt).toLocaleString()} />
                  </div>

                  <section className="questionnaire">
                    <div className="section-title">Questionnaire</div>
                    <div className="question-grid">
                      {Object.entries(active.payload || {}).map(([key, value]) => {
                        const answer = (value as any)?.answer;
                        const photoUrl = (value as any)?.photoUrl;
                        const label = questionLabels[key] || `Question ${key.replace(/\D/g, "") || key}`;
                        return (
                          <div key={key} className="question-card">
                            <div className="q-header">
                              <div className="q-label">{label}</div>
                              <span className={`chip ${answer === "YES" ? "chip-yes" : "chip-no"}`}>
                                {answer || "N/A"}
                              </span>
                            </div>
                            {photoUrl ? (
                              <details className="photo-block">
                                <summary>View photo</summary>
                                <img src={photoUrl} alt="answer proof" className="thumb" />
                              </details>
                            ) : (
                              <div className="muted small">No photo provided</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {actionError && <div className="alert error">{actionError}</div>}
                  {actionStatus && <div className="alert success">{actionStatus}</div>}
                </div>
                <div className="modal-footer sticky-footer">
                  <div className="flex gap-2">
                    <button className="btn btn-success" onClick={() => setConfirmAction("APPROVED")}>
                      Approve
                    </button>
                    <button className="btn btn-secondary" onClick={() => setConfirmAction("ACTION_REQUIRED")}>
                      Action Required
                    </button>
                    <button className="btn btn-danger" onClick={() => setConfirmAction("REJECTED")}>
                      Reject
                    </button>
                  </div>
                  {confirmAction && (
                    <div className="confirm-bar">
                      <span>Confirm {confirmAction.replace("_", " ").toLowerCase()}?</span>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>
                          Cancel
                        </button>
                        <button className="btn btn-primary" onClick={() => { updateStatus(confirmAction); setConfirmAction(null); }}>
                          Yes, proceed
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label>{label}</label>
      <div className="muted">{value || "-"}</div>
    </div>
  );
}

const styles = `
.detail-grid { margin-bottom: 16px; }
.questionnaire { margin-top: 16px; }
.section-title { font-weight: 700; margin-bottom: 8px; }
.question-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.question-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
.q-header { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.q-label { font-weight: 600; color: #0f172a; }
.chip { padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; color: #0f172a; }
.chip-yes { background: #dcfce7; color: #166534; }
.chip-no { background: #fee2e2; color: #991b1b; }
.thumb { width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 1px solid #e2e8f0; }
.photo-block summary { cursor: pointer; color: #1d4ed8; font-weight: 600; }
.small { font-size: 12px; }
.sticky-footer { border-top: 1px solid #e2e8f0; padding: 12px; background: #fff; position: sticky; bottom: 0; }
.confirm-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 8px; }
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}
