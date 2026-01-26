'use client';

import { useEffect, useMemo, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Report = {
  id: string;
  status: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  questionnaire: any;
  bin: {
    id: string;
    areaName: string;
    areaType: string;
    locationName: string;
    roadType?: string;
    latitude?: number;
    longitude?: number;
  };
  submittedBy?: { id: string; name: string; email: string };
};

export default function TwinbinQcReportsPage() {
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
      const res = await TwinbinApi.pendingReports();
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

  const setStatus = async (status: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
    if (!active) return;
    setActionStatus(`Marking ${status.toLowerCase()}...`);
    setActionError("");
    try {
      if (status === "APPROVED") await TwinbinApi.approveReport(active.id);
      else if (status === "REJECTED") await TwinbinApi.rejectReport(active.id);
      else await TwinbinApi.actionRequiredReport(active.id);
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
      <ModuleGuard module="TWINBIN" roles={["QC"]}>
        <div className="page">
          <h1>Twinbin Reports - Pending</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="muted">No pending reports.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Area</div>
                <div>Location</div>
                <div>Employee</div>
                <div>Distance</div>
                <div>Created</div>
                <div>Action</div>
              </div>
              {reports.map((r) => (
                <div className="table-row" key={r.id}>
                  <div>{r.bin?.areaName}</div>
                  <div>{r.bin?.locationName}</div>
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
                    <Field label="Area" value={active.bin?.areaName} />
                    <Field label="Area Type" value={active.bin?.areaType} />
                    <Field label="Location" value={active.bin?.locationName} />
                    <Field label="Road Type" value={active.bin?.roadType || "-"} />
                    <Field label="Bin Lat" value={active.bin?.latitude?.toString() || "-"} />
                    <Field label="Bin Lng" value={active.bin?.longitude?.toString() || "-"} />
                    <Field label="Submitted By" value={active.submittedBy?.name || "-"} />
                    <Field label="Distance" value={`${active.distanceMeters?.toFixed(1)} m`} />
                    <Field label="Submitted At" value={new Date(active.createdAt).toLocaleString()} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label>Questionnaire</label>
                    <pre style={{ background: "#f8fafc", padding: 10, borderRadius: 6, overflow: "auto" }}>
                      {JSON.stringify(active.questionnaire, null, 2)}
                    </pre>
                  </div>
                  {actionError && <div className="alert error">{actionError}</div>}
                  {actionStatus && <div className="alert success">{actionStatus}</div>}
                  <div className="flex gap-2" style={{ marginTop: 12 }}>
                    <button className="btn btn-success" onClick={() => setStatus("APPROVED")}>
                      Approve
                    </button>
                    <button className="btn btn-secondary" onClick={() => setStatus("ACTION_REQUIRED")}>
                      Action Required
                    </button>
                    <button className="btn btn-danger" onClick={() => setStatus("REJECTED")}>
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
