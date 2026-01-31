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
                const res = await ModuleRecordsApi.getRecords("twinbin");
                setRecords(res.records || []);
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
        <div className="content">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <p className="eyebrow">Module · Litter Bins</p>
                    <h1>City Governance Dashboard</h1>
                    <p className="muted">Monitoring active litter bins across all zones.</p>
                </div>
                <div className="badge badge-primary">City Admin View</div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-5 gap-4 mb-8">
                <KpiCard label="Total Bins" value={stats.total} />
                <KpiCard label="Pending QC" value={stats.pending} color="text-warning" />
                <KpiCard label="Approved" value={stats.approved} color="text-success" />
                <KpiCard label="Rejected" value={stats.rejected} color="text-error" />
                <KpiCard label="Action Required" value={stats.actionRequired} highlight />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Zone Breakdown */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card">
                        <h2 className="mb-4 text-lg">Zone-wise Breakdown</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left border-b border-base-200">
                                        <th className="pb-2">Zone</th>
                                        <th className="pb-2 text-right">Total</th>
                                        <th className="pb-2 text-right">Pend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zoneStats.map((z) => (
                                        <tr key={z.name} className="border-b border-base-100 last:border-0">
                                            <td className="py-2 font-medium">{z.name}</td>
                                            <td className="py-2 text-right">{z.total}</td>
                                            <td className="py-2 text-right text-warning font-medium">{z.pending}</td>
                                        </tr>
                                    ))}
                                    {zoneStats.length === 0 && (
                                        <tr><td colSpan={3} className="text-center py-4 muted">No zone data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Reports View */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg">All Records</h2>
                            <div className="flex gap-2">
                                <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>All</TabButton>
                                <TabButton active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')}>Pending</TabButton>
                                <TabButton active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')}>Approved</TabButton>
                                <TabButton active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')}>Rejected</TabButton>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm table-auto">
                                <thead className="bg-base-200">
                                    <tr className="text-left">
                                        <th className="p-3">Location</th>
                                        <th className="p-3">Zone / Ward</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.slice(0, 50).map((r) => (
                                        <tr key={r.id} className="border-b border-base-100 hover:bg-base-50">
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
                                        </tr>
                                    ))}
                                    {filteredRecords.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center muted">No records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {filteredRecords.length > 50 && (
                                <div className="p-3 text-center text-xs muted border-t border-base-100">
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
