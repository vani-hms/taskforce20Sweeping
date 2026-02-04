'use client';

import { useEffect, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, TaskforceApi } from "@lib/apiClient";

type ActionReport = {
  id: string;
  status: string;
  createdAt: string;
  feederPoint?: {
    id: string;
    feederPointName?: string;
    areaName?: string;
    areaType?: string;
    locationDescription?: string;
    zoneId?: string;
    wardId?: string;
  };
};

export default function TaskforceActionOfficerPage() {
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
      const res = await TaskforceApi.actionOfficerPending();
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

  const handleSubmit = async () => {
    if (!active) return;
    setSubmitLoading(true);
    try {
      await TaskforceApi.actionOfficerSubmit(active.id, { actionNote: actionNote.trim() || undefined });
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

  const pendingCount = reports.length;
  const totalInScope = pendingCount + returnedCount;

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["ACTION_OFFICER"]}>
        <div style={{ padding: '20px 40px', backgroundColor: '#f8fafc', minHeight: '100vh', animation: 'fadeIn 0.5s ease-out' }}>
          <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .compact-card {
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .card-header-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 800;
                    margin: 0;
                    color: #0f172a;
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    text-align: left;
                    font-size: 12px;
                    color: #0f172a;
                    padding: 12px 8px;
                    border-bottom: 2px solid #f1f5f9;
                    font-weight: 700;
                }
                .modern-table td {
                    padding: 12px 8px;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #334155;
                }
                .btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .btn-primary {
                    background-color: #3b82f6;
                    color: white;
                }
                .btn-outline {
                    background-color: transparent;
                    border-color: #e2e8f0;
                    color: #475569;
                }
                .btn-outline:hover {
                    border-color: #cbd5e1;
                    background-color: #f8fafc;
                }
                .btn-ghost {
                    background: transparent;
                    color: #64748b;
                }
                .btn-ghost:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }
            `}</style>

          <header style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', background: '#e2e8f0', padding: '4px 8px', borderRadius: 4, color: '#475569' }}>CTU / GVP</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Module</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Action Officer Dashboard</h1>
            <p style={{ marginTop: 8, color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>
              Review action-required reports and send them back to QC.
            </p>
          </header>

          {error && (
            <div style={{ padding: 16, borderRadius: 8, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: 24, fontSize: 14, fontWeight: 600, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <div className="stats-compact-grid" style={{ marginBottom: 32 }}>
            <StatCard label="PENDING ACTIONS" value={pendingCount} sub="Needs Attention" color="#f59e0b" />
            <StatCard label="RETURNED TO QC" value={returnedCount} sub="Processed" color="#10b981" />
            <StatCard label="TOTAL IN SCOPE" value={totalInScope} sub="Active Queue" color="#6366f1" />
          </div>

          <div className="compact-card">
            <div className="card-header-flex">
              <h3 className="section-title">Action Required Queue</h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Location Details</th>
                    <th>Zone / Ward</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading queue...</td></tr>
                  ) : reports.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No action required reports.</td></tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.feederPoint?.areaName || r.feederPoint?.feederPointName || "Unknown Area"}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{r.feederPoint?.locationDescription || "-"}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, width: 'fit-content' }}>
                              ZONE {r.feederPoint?.zoneId || "?"}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Ward {r.feederPoint?.wardId || "?"}</span>
                          </div>
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-primary btn-sm" style={{ padding: '4px 12px', fontSize: 11 }} onClick={() => setActive(r)}>
                            Process
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
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white', borderRadius: 16,
              width: '90%', maxWidth: 640,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Process Report</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>ID: {active.id}</p>
                </div>
                <button onClick={() => { setActive(null); setActionNote(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
              </div>

              <div style={{ padding: 32 }}>
                <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Area Name" value={active.feederPoint?.areaName || active.feederPoint?.feederPointName} />
                    <Field label="Location Desc" value={active.feederPoint?.locationDescription} />
                    <Field label="Zone" value={active.feederPoint?.zoneId} />
                    <Field label="Ward" value={active.feederPoint?.wardId} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    Action Remarks <span style={{ opacity: 0.5, fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <textarea
                    style={{
                      width: '100%', height: 100, padding: 12, borderRadius: 8,
                      border: '1px solid #cbd5e1', fontSize: 14, outline: 'none'
                    }}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Describe the action taken to resolve this issue..."
                  />
                </div>

                <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button className="btn btn-ghost" onClick={() => { setActive(null); setActionNote(""); }}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    disabled={submitLoading}
                    onClick={handleSubmit}
                    style={{ opacity: submitLoading ? 0.7 : 1 }}
                  >
                    {submitLoading ? "Submitting..." : "Submit to QC"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </ModuleGuard>
    </Protected>
  );
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div style={{
      borderLeft: `6px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'white',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em', color: '#1e293b' }}>{value}</div>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    'APPROVED': { bg: '#dcfce7', text: '#166534' },
    'ACTION_TAKEN': { bg: '#dcfce7', text: '#166534' },
    'COMPLETED': { bg: '#dcfce7', text: '#166534' },
    'REJECTED': { bg: '#fee2e2', text: '#991b1b' },
    'PENDING': { bg: '#fef3c7', text: '#d97706' },
    'ACTION_REQUIRED': { bg: '#ffedd5', text: '#9a3412' }
  };
  const s = config[status] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 800,
      backgroundColor: s.bg,
      color: s.text,
      textTransform: 'uppercase'
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>{value || "-"}</div>
    </div>
  );
}
