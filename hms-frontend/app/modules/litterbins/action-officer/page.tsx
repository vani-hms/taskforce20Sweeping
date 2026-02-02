'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type ActionReport = {
  id: string;
  status: string;
  createdAt: string;
  bin?: {
    id: string;
    areaName?: string;
    locationName?: string;
    zoneId?: string;
    wardId?: string;
  };
};

export default function LitterbinsActionOfficerPage() {
  const [reports, setReports] = useState<ActionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<ActionReport | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [returnedCount, setReturnedCount] = useState(0);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await TwinbinApi.actionOfficerPending();
      setReports(res.reports || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load pending actions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = reports.length;
  const totalInScope = pendingCount + returnedCount;

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitLoading(true);
    try {
      await TwinbinApi.actionOfficerSubmit(active.id, { actionNote: actionNote.trim() || undefined });
      setReports((prev) => prev.filter((r) => r.id !== active.id));
      setReturnedCount((c) => c + 1);
      setActive(null);
      setActionNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit response");
    } finally {
      setSubmitLoading(false);
    }
  };

  const rows = useMemo(() => reports, [reports]);

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["ACTION_OFFICER"]}>
        <div className="content">
          <header className="flex justify-between items-start mb-8">
            <div>
              <p className="eyebrow">Module - Litter Bins</p>
              <h1>Action Officer Dashboard</h1>
              <p className="muted">Review action-required bin reports and send them back to QC.</p>
            </div>
            <div className="badge badge-info">Action Officer</div>
          </header>

          {error && <div className="alert error mb-4">{error}</div>}

          <div className="grid grid-3 gap-4 mb-8">
            <StatCard label="Pending Action Required" value={pendingCount} />
            <StatCard label="Sent Back to QC" value={returnedCount} />
            <StatCard label="Total in Scope" value={totalInScope} />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg">Action Required Queue</h2>
            </div>

            <div className="overflow-x-auto min-h-[320px]">
              <table className="w-full text-sm table-auto">
                <thead className="bg-base-200">
                  <tr className="text-left">
                    <th className="p-3">Bin Name / Location</th>
                    <th className="p-3">Zone / Ward</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-base-100">
                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-32 animate-pulse"></div></td>
                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-24 animate-pulse"></div></td>
                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-16 animate-pulse"></div></td>
                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-24 animate-pulse"></div></td>
                        <td className="p-3"></td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center muted">No action required reports.</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-base-100 hover:bg-base-50">
                        <td className="p-3">
                          <div className="font-medium">{r.bin?.areaName || "-"}</div>
                          <div className="text-xs muted">{r.bin?.locationName || "-"}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-xs">{r.bin?.zoneId || "-"}</div>
                          <div className="text-xs muted">{r.bin?.wardId || "-"}</div>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-3 text-xs muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-right">
                          <button className="btn btn-xs btn-primary" onClick={() => setActive(r)}>View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {active && (
            <div className="modal modal-open">
              <div className="modal-box w-11/12 max-w-2xl">
                <h3 className="font-bold text-lg mb-2">Action Required Details</h3>
                <div className="muted text-sm mb-4">Report ID: <span className="font-mono">{active.id}</span></div>

                <div className="grid grid-2 gap-3 mb-4">
                  <Field label="Bin" value={active.bin?.areaName || "-"} />
                  <Field label="Location" value={active.bin?.locationName || "-"} />
                  <Field label="Zone" value={active.bin?.zoneId || "-"} />
                  <Field label="Ward" value={active.bin?.wardId || "-"} />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Action note (optional)</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={4}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Describe the action taken"
                  />
                </div>

                <div className="modal-action">
                  <button className="btn" onClick={() => { setActive(null); setActionNote(""); }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" disabled={submitLoading} onClick={handleSubmit}>
                    {submitLoading ? "Submitting..." : "Submit to QC"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="muted text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let style = "bg-base-200 text-base-content";
  if (status === "ACTION_REQUIRED") style = "bg-warning/10 text-warning";
  if (status === "PENDING_QC") style = "bg-info/10 text-info";
  if (status === "APPROVED") style = "bg-success/10 text-success";
  if (status === "REJECTED") style = "bg-error/10 text-error";
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${style}`}>{status.replace(/_/g, " ")}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted text-xs uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
