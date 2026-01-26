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

  const active = useMemo(() => reports.find((r) => r.id === activeId) || null, [reports, activeId]);

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
                  <div className="grid grid-2">
                    <Field label="Feeder" value={active.feederPoint?.feederPointName} />
                    <Field label="Area" value={active.feederPoint?.areaName} />
                    <Field label="Area Type" value={active.feederPoint?.areaType} />
                    <Field label="Location" value={active.feederPoint?.locationDescription} />
                    <Field label="Employee" value={active.submittedBy?.name || "-"} />
                    <Field label="Distance" value={`${active.distanceMeters?.toFixed(1)} m`} />
                    <Field label="Submitted At" value={new Date(active.createdAt).toLocaleString()} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label>Payload</label>
                    <pre style={{ background: "#f8fafc", padding: 10, borderRadius: 6, overflow: "auto" }}>
                      {JSON.stringify(active.payload, null, 2)}
                    </pre>
                  </div>
                  {actionError && <div className="alert error">{actionError}</div>}
                  {actionStatus && <div className="alert success">{actionStatus}</div>}
                  <div className="flex gap-2" style={{ marginTop: 12 }}>
                    <button className="btn btn-success" onClick={() => updateStatus("APPROVED")}>
                      Approve
                    </button>
                    <button className="btn btn-secondary" onClick={() => updateStatus("ACTION_REQUIRED")}>
                      Action Required
                    </button>
                    <button className="btn btn-danger" onClick={() => updateStatus("REJECTED")}>
                      Reject
                    </button>
                  </div>
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
