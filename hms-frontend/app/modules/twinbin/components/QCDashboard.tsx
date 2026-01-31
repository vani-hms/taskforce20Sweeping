'use client';

import { useEffect, useState, useMemo } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError, AuthApi, apiFetch } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function QCDashboard() {
    const { user: authUser } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED'>('PENDING');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [scope, setScope] = useState<{
        zones: string[];
        wards: string[];
        zoneIds: string[];
        wardIds: string[]
    } | null>(null);

    async function loadData() {
        try {
            console.log("QCDashboard: Starting strict loadData...");

            // 1. Fetch Me
            const meRes = await AuthApi.getMe();
            console.log("ME RESPONSE", meRes);
            const user = meRes.user;
            const cityId = user.cityId || authUser?.cityId;
            const zoneIds: string[] = user.zoneIds || [];
            const wardIds: string[] = user.wardIds || [];

            console.log("cityId", cityId);
            console.log("zoneIds", zoneIds);
            console.log("wardIds", wardIds);

            // 2. Resolve Names (Manual Fetch)
            let resolvedZoneNames: string[] = [];
            let resolvedWardNames: string[] = [];

            try {
                if (cityId) {
                    // Fetch Zones for City
                    const zonesRes = await apiFetch<{ zones: { id: string; name: string }[] }>(`/public/cities/${cityId}/zones`);
                    const allZones = zonesRes.zones || [];
                    resolvedZoneNames = allZones
                        .filter(z => zoneIds.includes(z.id))
                        .map(z => z.name);

                    // Fetch Wards for EACH assigned Zone
                    if (zoneIds.length > 0) {
                        const wardPromises = zoneIds.map(zId =>
                            apiFetch<{ wards: { id: string; name: string }[] }>(`/public/zones/${zId}/wards`)
                        );
                        const wardResponses = await Promise.all(wardPromises);
                        const allWards = wardResponses.flatMap(r => r.wards || []);

                        resolvedWardNames = allWards
                            .filter(w => wardIds.includes(w.id))
                            .map(w => w.name);
                    }
                } else {
                    console.warn("QCDashboard: No cityId available for name resolution");
                }
            } catch (nameErr) {
                console.error("QCDashboard: Name resolution failed (continuing with IDs)", nameErr);
                // Fallback to IDs if names fail, or generic "Error" if preferred, 
                // but user wants "Load Error" gone. Let's just use what we have.
            }

            console.log("RESOLVED ZONES", resolvedZoneNames);
            console.log("RESOLVED WARDS", resolvedWardNames);

            // 3. SET SCOPE STATE (ALWAYS)
            const finalScope = {
                zoneIds: zoneIds,
                wardIds: wardIds,
                zones: resolvedZoneNames.length > 0 ? resolvedZoneNames : (zoneIds.length > 0 ? ["Ids: " + zoneIds.length] : ["All Zones"]),
                wards: resolvedWardNames.length > 0 ? resolvedWardNames : (wardIds.length > 0 ? ["Ids: " + wardIds.length] : ["All Wards"])
            };
            setScope(finalScope);

            // 4. Fetch Records using Scope IDs
            const filters = {
                zoneIds: zoneIds.length ? zoneIds : undefined,
                wardIds: wardIds.length ? wardIds : undefined
            };
            console.log("QC FILTERS SENT", filters.zoneIds, filters.wardIds);

            const recordsRes = await ModuleRecordsApi.getRecords("twinbin", filters);
            setRecords(recordsRes.records || []);

        } catch (err) {
            console.error("QCDashboard: Fatal load error", err);
            // Even in fatal error, try to set scope if we have authUser
            if (!scope) {
                setScope({
                    zones: ["Load Error"], wards: ["Load Error"],
                    zoneIds: [], wardIds: []
                });
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []); // Run once on mount

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
            // re-load data to refresh records
            loadData();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    if (loading) return <div className="p-8 text-center muted">Loading QC Dashboard...</div>;

    return (
        <div className="content">
            <header className="flex justify-between items-start mb-8">
                <div>
                    <p className="eyebrow">Module · Litter Bins</p>
                    <h1>QC Dashboard</h1>
                    <div className="muted text-sm flex flex-col gap-1 mt-2">
                        <div className="flex gap-2">
                            <span className="font-semibold text-base-content w-16">Zones:</span>
                            <span>{scope?.zones?.join(", ") || "Loading..."}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-base-content w-16">Wards:</span>
                            <span>{scope?.wards?.join(", ") || "Loading..."}</span>
                        </div>
                    </div>
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
