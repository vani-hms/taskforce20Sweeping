'use client';

import { useEffect, useState, useMemo } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError } from "@lib/apiClient";

export default function QCDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED'>('PENDING');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    useEffect(() => {
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

    const filteredRecords = useMemo(() => {
        if (activeTab === 'ALL') return records;
        if (activeTab === 'PENDING') return records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING');
        return records.filter(r => r.status === activeTab);
    }, [records, activeTab]);

    const uniqueZones = useMemo(() => {
        const zones = new Set<string>();
        records.forEach(r => { if (r.zoneName) zones.add(r.zoneName) });
        return Array.from(zones).sort();
    }, [records]);

    async function handleAction(record: any, action: 'APPROVE' | 'REJECT') {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this item?`)) return;

        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REGISTRATION') {
                if (action === 'APPROVE') await TwinbinApi.approve(record.id, {});
                else await TwinbinApi.reject(record.id);
            } else if (record.type === 'VISIT_REPORT') {
                if (action === 'APPROVE') await TwinbinApi.approveVisit(record.id);
                else await TwinbinApi.rejectVisit(record.id);
            } else if (record.type === 'CITIZEN_REPORT') {
                if (action === 'APPROVE') await TwinbinApi.approveReport(record.id);
                else await TwinbinApi.rejectReport(record.id);
            }
            await loadData();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) return <div className="p-8 text-center muted">Loading your assigned records...</div>;

    return (
        <div className="content">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <p className="eyebrow">Module · Litter Bins</p>
                    <h1>QC Dashboard</h1>
                    <p className="muted">
                        Review pending items in your assigned zones:
                        <span className="text-primary font-medium ml-2">
                            {uniqueZones.length > 0 ? uniqueZones.join(", ") : "Loading..."}
                        </span>
                    </p>
                </div>
                <div className="badge badge-warning">QC Access</div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-5 gap-4 mb-8">
                <KpiCard label="Total In Scope" value={stats.total} />
                <KpiCard label="Pending Review" value={stats.pending} color="text-warning" highlight />
                <KpiCard label="Approved" value={stats.approved} color="text-success" />
                <KpiCard label="Rejected" value={stats.rejected} color="text-error" />
                <KpiCard label="Action Req" value={stats.actionRequired} />
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg">Records Review</h2>
                    <div className="flex gap-2">
                        <TabButton active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')}>Pending Review</TabButton>
                        <TabButton active={activeTab === 'ACTION_REQUIRED'} onClick={() => setActiveTab('ACTION_REQUIRED')}>Action Required</TabButton>
                        <TabButton active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')}>Approved</TabButton>
                        <TabButton active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')}>Rejected</TabButton>
                        <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>All History</TabButton>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm table-auto">
                        <thead className="bg-base-200">
                            <tr className="text-left">
                                <th className="p-3">Type</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Zone / Ward</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Date</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((r) => (
                                <tr key={r.id} className="border-b border-base-100 hover:bg-base-50">
                                    <td className="p-3 font-medium text-xs">{r.type?.replace(/_/g, " ")}</td>
                                    <td className="p-3">
                                        <div className="font-medium">{r.areaName}</div>
                                        <div className="text-xs muted">{r.locationName || "—"}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs">{r.zoneName || "—"}</div>
                                        <div className="text-xs muted">{r.wardName || "—"}</div>
                                    </td>
                                    <td className="p-3">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="p-3 text-xs muted">
                                        {new Date(r.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-right">
                                        {(r.status === 'PENDING_QC' || r.status === 'PENDING') && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    className="btn btn-xs btn-success"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction(r, 'APPROVE')}
                                                >
                                                    {actionLoading === r.id ? '...' : 'Approve'}
                                                </button>
                                                <button
                                                    className="btn btn-xs btn-error"
                                                    disabled={!!actionLoading}
                                                    onClick={() => handleAction(r, 'REJECT')}
                                                >
                                                    {actionLoading === r.id ? '...' : 'Reject'}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center muted">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, color, highlight }: { label: string; value: number; color?: string; highlight?: boolean }) {
    return (
        <div className={`card ${highlight ? 'border-primary border' : ''}`}>
            <div className="muted text-xs uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
        </div>
    );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-base-200 hover:bg-base-300'
                }`}
        >
            {children}
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    let style = "bg-base-200 text-base-content";
    if (status === "APPROVED") style = "bg-success/10 text-success";
    if (status === "PENDING_QC" || status === "PENDING") style = "bg-warning/10 text-warning";
    if (status === "REJECTED") style = "bg-error/10 text-error";
    if (status === "ACTION_REQUIRED") style = "bg-info/10 text-info";

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${style}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}
