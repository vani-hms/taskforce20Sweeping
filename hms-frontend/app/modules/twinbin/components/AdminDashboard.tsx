'use client';

import { useEffect, useState, useMemo } from "react";
import { ModuleRecordsApi } from "@lib/apiClient";

export default function AdminDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

    useEffect(() => {
        async function loadData() {
            try {
                const res = await ModuleRecordsApi.getRecords("twinbin") as any;
                setRecords(res.data || []);
            } catch (err) {
                console.error("Failed to load records", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const stats = useMemo(() => {
        return {
            total: records.length,
            pending: records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING').length,
            approved: records.filter(r => r.status === 'APPROVED').length,
            rejected: records.filter(r => r.status === 'REJECTED').length,
            actionRequired: records.filter(r => r.status === 'ACTION_REQUIRED').length,
        };
    }, [records]);

    const zoneStats = useMemo(() => {
        const zones: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};
        records.forEach(r => {
            const zone = r.zoneName || "Unknown Zone";
            if (!zones[zone]) zones[zone] = { total: 0, pending: 0, approved: 0, rejected: 0 };
            zones[zone].total++;
            if (r.status === 'PENDING_QC' || r.status === 'PENDING') zones[zone].pending++;
            if (r.status === 'APPROVED') zones[zone].approved++;
            if (r.status === 'REJECTED') zones[zone].rejected++;
        });
        return Object.entries(zones).map(([name, stat]) => ({ name, ...stat }));
    }, [records]);

    const filteredRecords = useMemo(() => {
        if (activeTab === 'ALL') return records;
        if (activeTab === 'PENDING') return records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING');
        return records.filter(r => r.status === activeTab);
    }, [records, activeTab]);

    if (loading) return <div className="p-8 text-center muted">Loading city data...</div>;

    return (
        <div className="reports-tab" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .section-divider {
                    height: 1px;
                    background: #e2e8f0;
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
                .compact-card {
                    padding: 24px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    text-align: left;
                    font-size: 11px;
                    color: #64748b;
                    padding: 12px 16px;
                    border-bottom: 2px solid #f1f5f9;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .modern-table td {
                    padding: 16px 16px;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .tab-btn {
                    padding: 6px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                }
                .tab-btn.active {
                    background: #eff6ff;
                    color: #2563eb;
                    box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
                }
            `}</style>

            <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>Module · Litter Bins</p>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>City Governance Dashboard</h1>
                    <p style={{ color: '#64748b', marginTop: 8 }}>Monitoring active litter bins across all zones.</p>
                </div>
                <div style={{ background: '#dbeafe', color: '#1e40af', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999, border: '1px solid #bfdbfe' }}>
                    City Admin View
                </div>
            </header>

            {/* KPI Cards */}
            <div className="stats-compact-grid mb-8">
                <StatCard label="Total Bins" value={stats.total} sub="Total records" color="#3b82f6" />
                <StatCard label="Pending QC" value={stats.pending} sub="Awaiting Review" color="#f59e0b" />
                <StatCard label="Approved" value={stats.approved} sub="Verified Status" color="#059669" />
                <StatCard label="Rejected" value={stats.rejected} sub="Non-Compliant" color="#ef4444" />
                <StatCard label="Action Required" value={stats.actionRequired} sub="Critical" color="#f43f5e" />
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Zone Breakdown */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="compact-card">
                        <h2 className="section-title mb-4">Zone-wise Breakdown</h2>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Zone</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                    <th style={{ textAlign: 'right' }}>Pend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {zoneStats.map((z) => (
                                    <tr key={z.name}>
                                        <td style={{ fontWeight: 600, color: '#334155' }}>{z.name}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 500, color: '#64748b' }}>{z.total}</td>
                                        <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{z.pending}</td>
                                    </tr>
                                ))}
                                {zoneStats.length === 0 && (
                                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No zone data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reports View */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="compact-card">
                        <div className="card-header-flex">
                            <h2 className="section-title">All Records</h2>
                            <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 10 }}>
                                <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>All</button>
                                <button className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>Pending</button>
                                <button className={`tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`} onClick={() => setActiveTab('APPROVED')}>Approved</button>
                                <button className={`tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveTab('REJECTED')}>Rejected</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Location</th>
                                        <th>Zone / Ward</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.slice(0, 50).map((r) => (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.areaName}</div>
                                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.locationName || "—"}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{r.zoneName || "—"}</div>
                                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.wardName || "—"}</div>
                                            </td>
                                            <td>
                                                <StatusBadge status={r.status} />
                                            </td>
                                            <td style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                                                {new Date(r.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRecords.length === 0 && (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {filteredRecords.length > 50 && (
                                <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f5f9' }}>
                                    Showing first 50 records
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="stat-card-compact" style={{ borderLeft: `6px solid ${color}`, position: 'relative', overflow: 'hidden', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', borderLeftWidth: 6, borderLeftColor: color }}>
            <div className="stat-label">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="stat-value" style={{ color: '#1e293b' }}>{value}</div>
            </div>
            <div className="stat-sub">{sub}</div>
            <style jsx>{`
                .stat-card-compact {
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .stat-card-compact:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                }
                .stat-label {
                    font-size: 10px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }
                .stat-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'APPROVED': { bg: '#dcfce7', text: '#166534' },
        'REJECTED': { bg: '#fee2e2', text: '#991b1b' },
        'PENDING_QC': { bg: '#fef3c7', text: '#b45309' },
        'PENDING': { bg: '#fef3c7', text: '#b45309' },
        'ACTION_REQUIRED': { bg: '#ffedd5', text: '#9a3412' }
    };
    const s = config[status] || { bg: '#f1f5f9', text: '#475569' };
    return (
        <span style={{
            background: s.bg,
            color: s.text,
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'inline-block'
        }}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}
