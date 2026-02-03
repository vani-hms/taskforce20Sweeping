'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type ActionReport = {
  id: string;
  status: string;
  createdAt: string;
  actionOfficerRemark?: string;
  actionRemark?: string;
  actionPhotoUrl?: string; // For visits
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
  const [history, setHistory] = useState<ActionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<ActionReport | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, historyRes] = await Promise.all([
        TwinbinApi.actionOfficerPending(),
        TwinbinApi.actionOfficerHistory()
      ]);
      setReports(pendingRes.reports || []);
      setHistory(historyRes.reports || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load actions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitLoading(true);
    try {
      await TwinbinApi.actionOfficerSubmit(active.id, { actionNote: actionNote.trim() || undefined });

      // Move from Pending to History locally
      const updated = { ...active, status: 'ACTION_TAKEN', actionOfficerRemark: actionNote.trim() || undefined };
      setReports((prev) => prev.filter((r) => r.id !== active.id));
      setHistory((prev) => [updated, ...prev]);

      setActive(null);
      setActionNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit response");
    } finally {
      setSubmitLoading(false);
    }
  };

  const rows = useMemo(() => activeTab === 'PENDING' ? reports : history, [reports, history, activeTab]);
  const pendingCount = reports.length;
  const completedCount = history.length;
  const totalInScope = pendingCount + completedCount;

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["ACTION_OFFICER"]}>
        <div className="min-h-screen bg-base-200/50 p-6 md:p-10">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-neutral badge-sm font-medium tracking-wide">LITTER BINS</span>
                <span className="text-xs font-semibold text-base-content/50 uppercase tracking-wider">Module</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-base-content tracking-tight">Action Officer Dashboard</h1>
              <p className="mt-2 text-base text-base-content/60 max-w-2xl">
                Review assigned bin reports, take necessary actions, and mark them as complete to notify QC.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold">Action Officer</div>
                <div className="text-xs text-base-content/50">Restricted Access</div>
              </div>
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-12 text-xl font-bold italic">AO</div>
              </div>
            </div>
          </header>

          {error && (
            <div className="alert alert-error shadow-sm rounded-xl mb-6 border border-error/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatCard label="Pending Actions" value={pendingCount} type="warning" />
            <StatCard label="Marked Complete" value={completedCount} type="success" />
            <StatCard label="Total in Scope" value={totalInScope} type="neutral" />
          </div>

          <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
            <div className="p-4 border-b border-base-200 bg-base-50/50 flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-lg font-bold">Tasks Queue</h2>
              <div className="tabs tabs-boxed bg-base-200/50 p-1 rounded-lg">
                <a
                  className={`tab tab-sm h-8 rounded-md transition-all ${activeTab === 'PENDING' ? 'bg-white shadow-sm text-base-content font-bold' : 'text-base-content/60 hover:text-base-content/80'}`}
                  onClick={() => setActiveTab('PENDING')}
                >
                  Pending <span className="ml-2 opacity-70 text-xs py-0.5 px-1.5 bg-base-300 rounded-full">{reports.length}</span>
                </a>
                <a
                  className={`tab tab-sm h-8 rounded-md transition-all ${activeTab === 'COMPLETED' ? 'bg-white shadow-sm text-base-content font-bold' : 'text-base-content/60 hover:text-base-content/80'}`}
                  onClick={() => setActiveTab('COMPLETED')}
                >
                  Completed <span className="ml-2 opacity-70 text-xs py-0.5 px-1.5 bg-base-300 rounded-full">{history.length}</span>
                </a>
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="table w-full">
                <thead className="bg-base-50/50 text-base-content/50 text-xs uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="py-4 pl-6">Bin Details</th>
                    <th className="py-4">Zone / Ward</th>
                    <th className="py-4">Status</th>
                    <th className="py-4">Date</th>
                    <th className="py-4 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="pl-6 py-4"><div className="h-10 bg-base-200 rounded-lg w-48 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-base-200 rounded w-24 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-6 bg-base-200 rounded-full w-20 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-base-200 rounded w-24 animate-pulse"></div></td>
                        <td className="pr-6 py-4"></td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-base-content/40">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">📭</span>
                          <span className="font-medium">No items found in {activeTab.toLowerCase()} queue.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="group hover:bg-base-50/50 transition-colors">
                        <td className="pl-6 py-4">
                          <div className="font-bold text-base-content">{r.bin?.areaName || "Unknown Area"}</div>
                          <div className="text-xs text-base-content/50 font-medium mt-0.5">{r.bin?.locationName || "No location info"}</div>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-base-200 text-base-content/70 w-fit">
                              ZONE {r.bin?.zoneId || "?"}
                            </span>
                            <span className="text-xs text-base-content/50 ml-1">Ward {r.bin?.wardId || "?"}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <StatusBadge status={activeTab === 'COMPLETED' ? 'ACTION_TAKEN' : r.status} />
                        </td>
                        <td className="py-4">
                          <div className="text-sm font-medium text-base-content/80">{new Date(r.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-base-content/40">{new Date(r.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="pr-6 py-4 text-right">
                          <button
                            className={`btn btn-sm ${activeTab === 'PENDING' ? 'btn-primary shadow-primary/20' : 'btn-ghost border-base-200 hover:bg-base-200'} font-bold shadow-sm`}
                            onClick={() => setActive(r)}
                          >
                            {activeTab === 'PENDING' ? 'Process' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {active && (
          <dialog className="modal modal-open bg-base-300/50 backdrop-blur-sm">
            <div className="modal-box w-11/12 max-w-2xl p-0 overflow-hidden shadow-2xl rounded-2xl">
              <div className="bg-base-100 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-base-content">
                      {activeTab === 'COMPLETED' ? 'Report Details' : 'Process Report'}
                    </h3>
                    <div className="text-sm text-base-content/50 mt-1 font-mono">ID: {active.id.slice(0, 8)}...</div>
                  </div>
                  <button className="btn btn-sm btn-circle btn-ghost" onClick={() => { setActive(null); setActionNote(""); }}>✕</button>
                </div>

                <div className="bg-base-200/50 rounded-xl p-5 mb-6 border border-base-200">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <Field label="Bin Area" value={active.bin?.areaName} />
                    <Field label="Specific Location" value={active.bin?.locationName} />
                    <Field label="Zone" value={active.bin?.zoneId} />
                    <Field label="Ward" value={active.bin?.wardId} />
                  </div>
                </div>

                {activeTab === 'COMPLETED' ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-2">Action Officer's Note</div>
                      <div className="p-4 bg-base-100 rounded-xl border border-base-200 text-sm text-base-content/80 leading-relaxed shadow-sm">
                        {active.actionOfficerRemark || active.actionRemark || <span className="italic text-base-content/40">No remarks provided.</span>}
                      </div>
                    </div>
                    {active.actionPhotoUrl && (
                      <div>
                        <div className="text-xs font-bold text-base-content/40 uppercase tracking-wider mb-2">Evidence Photo</div>
                        <div className="rounded-xl overflow-hidden border border-base-200 shadow-sm">
                          <img src={active.actionPhotoUrl} alt="Action Evidence" className="w-full max-h-80 object-cover bg-base-200" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label pl-0">
                      <span className="text-sm font-bold text-base-content/70">Action Remarks <span className="font-normal text-base-content/40">(Optional)</span></span>
                    </label>
                    <textarea
                      className="textarea textarea-bordered h-32 text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Describe the action taken to resolve this issue..."
                    />
                  </div>
                )}

                <div className="modal-action mt-8 flex items-center justify-end gap-3">
                  <button className="btn btn-ghost font-bold" onClick={() => { setActive(null); setActionNote(""); }}>
                    {activeTab === 'COMPLETED' ? 'Close' : 'Cancel'}
                  </button>
                  {activeTab === 'PENDING' && (
                    <button
                      className="btn btn-primary px-8 font-bold shadow-lg shadow-primary/30"
                      disabled={submitLoading}
                      onClick={handleSubmit}
                    >
                      {submitLoading ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Processing...
                        </>
                      ) : "Mark as Complete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </dialog>
        )}
      </ModuleGuard>
    </Protected>
  );
}

function StatCard({ label, value, type }: { label: string; value: number; type: 'warning' | 'success' | 'neutral' }) {
  const colors = {
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    neutral: "bg-base-200 text-base-content/70 border-base-200"
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[type] || colors.neutral} flex flex-col justify-between h-32 bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-4xl font-extrabold tracking-tight mt-2">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    "ACTION_REQUIRED": "bg-warning/15 text-warning-content border-warning/20",
    "PENDING": "bg-info/10 text-info border-info/20",
    "ACTION_TAKEN": "bg-success/15 text-success border-success/20",
    "APPROVED": "bg-success/15 text-success border-success/20",
    "REJECTED": "bg-error/10 text-error border-error/20"
  };

  const style = config[status] || "bg-base-200 text-base-content border-base-300";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase border ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-base-content/40 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-base-content/90">{value || "-"}</div>
    </div>
  );
}
