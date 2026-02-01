'use client';

import { useEffect, useState } from "react";
import { TaskforceApi, ApiError, AuthApi, apiFetch, EmployeesApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function TaskforceQCDashboard() {
    const { user: authUser } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ASSIGNED'>('PENDING');
    const [meta, setMeta] = useState<{ page: number; total: number; totalPages: number; limit?: number } | null>(null);
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; actionRequired: number; total: number } | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Record<string, string>>({});

    const [scope, setScope] = useState<{
        zones: string[];
        wards: string[];
        zoneIds: string[];
        wardIds: string[]
    } | null>(null);

    // Initial Load & Tab Change
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [activeTab, page]);

    async function loadData() {
        setLoading(true);
        try {
            const meRes = await AuthApi.getMe();
            const user = meRes.user;
            const cityId = user.cityId || authUser?.cityId;

            // STRICT SCOPE: Only use TASKFORCE module scope.
            const moduleScope = user.modules?.find((m: any) => m.key === 'TASKFORCE');
            const zoneIds: string[] = moduleScope?.zoneIds || [];
            const wardIds: string[] = moduleScope?.wardIds || [];

            // Load employees once for assignment dropdown
            if (employees.length === 0) {
                try {
                    const empRes = await EmployeesApi.list("TASKFORCE");
                    console.log("[QC][assign] employees fetched", (empRes.employees || []).length);
                    setEmployees(empRes.employees || []);
                } catch (empErr) {
                    console.error("Failed to load employees", empErr);
                }
            }

            // Resolve Names (Manual Fetch)
            if (!scope) {
                let resolvedZoneNames: string[] = [];
                let resolvedWardNames: string[] = [];
                try {
                    if (cityId && zoneIds.length > 0) {
                        const zonesRes = await apiFetch<{ zones: { id: string; name: string }[] }>(`/public/cities/${cityId}/zones`);
                        resolvedZoneNames = zonesRes.zones?.filter(z => zoneIds.includes(z.id)).map(z => z.name) || [];

                        const wardPromises = zoneIds.map(zId =>
                            apiFetch<{ wards: { id: string; name: string }[] }>(`/public/zones/${zId}/wards`)
                        );
                        const wardResponses = await Promise.all(wardPromises);
                        const allWards = wardResponses.flatMap(r => r.wards || []);
                        resolvedWardNames = allWards.filter(w => wardIds.includes(w.id)).map(w => w.name);
                    }
                } catch (nameErr) {
                    console.error("QCDashboard: Name resolution failed", nameErr);
                }
                setScope({
                    zoneIds, wardIds,
                    zones: resolvedZoneNames.length > 0 ? resolvedZoneNames : (zoneIds.length > 0 ? ["Ids: " + zoneIds.length] : []),
                    wards: resolvedWardNames.length > 0 ? resolvedWardNames : (wardIds.length > 0 ? ["Ids: " + wardIds.length] : [])
                });
            }

            if (activeTab === 'PENDING') {
                const pendingRes = await TaskforceApi.pendingFeederPoints();
                const pending = (pendingRes.feederPoints || []).map((p) => ({
                    id: p.id,
                    type: 'FEEDER_POINT',
                    status: p.status,
                    areaName: p.areaName,
                    locationName: p.feederPointName || p.locationDescription,
                    zoneId: p.zoneId,
                    wardId: p.wardId,
                    zoneName: p.zoneName,
                    wardName: p.wardName,
                    createdAt: p.createdAt
                }));
                setRecords(pending);
                setMeta({ page: 1, total: pending.length, totalPages: 1, limit });
                setStats({
                    pending: pending.length,
                    approved: 0,
                    rejected: 0,
                    actionRequired: 0,
                    total: pending.length
                });
                return;
            }

            if (activeTab === 'APPROVED') {
                const approvedRes = await TaskforceApi.approvedFeederPoints(false);
                const approved = (approvedRes.feederPoints || []).map((p) => ({
                    id: p.id,
                    type: 'FEEDER_POINT',
                    status: p.status,
                    areaName: p.areaName,
                    locationName: p.feederPointName || p.locationDescription,
                    zoneId: p.zoneId,
                    wardId: p.wardId,
                    zoneName: p.zoneName,
                    wardName: p.wardName,
                    createdAt: p.updatedAt || p.createdAt,
                    assignedEmployeeIds: p.assignedEmployeeIds || []
                }));
                setRecords(approved);
                setMeta({ page: 1, total: approved.length, totalPages: 1, limit });
                setStats({
                    pending: 0,
                    approved: approved.length,
                    rejected: 0,
                    actionRequired: 0,
                    total: approved.length
                });
                return;
            }

            if (activeTab === 'ASSIGNED') {
                const assignedRes = await TaskforceApi.approvedFeederPoints(true);
                const assigned = (assignedRes.feederPoints || []).map((p) => ({
                    id: p.id,
                    type: 'FEEDER_POINT',
                    status: p.status,
                    areaName: p.areaName,
                    locationName: p.feederPointName || p.locationDescription,
                    zoneId: p.zoneId,
                    wardId: p.wardId,
                    zoneName: p.zoneName,
                    wardName: p.wardName,
                    createdAt: p.updatedAt || p.createdAt,
                    assignedEmployeeIds: p.assignedEmployeeIds || []
                }));
                setRecords(assigned);
                setMeta({ page: 1, total: assigned.length, totalPages: 1, limit });
                setStats({
                    pending: 0,
                    approved: assigned.length,
                    rejected: 0,
                    actionRequired: 0,
                    total: assigned.length
                });
                return;
            }

            const filters = {
                page,
                limit,
                tab: activeTab,
                zoneIds: zoneIds.length ? zoneIds : undefined,
                wardIds: wardIds.length ? wardIds : undefined
            };

            const response = await TaskforceApi.getRecords(filters);

            setRecords(response.data || []);
            setMeta(response.meta || { page: 1, total: 0, totalPages: 1 });
            if (response.stats) {
                setStats(response.stats);
            }
        } catch (err) {
            console.error("Failed to load records", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAction(record: any, action: 'APPROVE' | 'REJECT') {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this item?`)) return;

        setActionLoading(record.id);
        try {
            if (record.type === 'FEEDER_POINT') {
                if (action === 'APPROVE') await TaskforceApi.approveRequest(record.id, { status: "APPROVED" });
                else await TaskforceApi.rejectRequest(record.id);
            } else if (record.type === 'FEEDER_REPORT') {
                if (action === 'APPROVE') await TaskforceApi.approveReport(record.id);
                else await TaskforceApi.rejectReport(record.id);
            } else {
                // Hard guard: this dashboard is only for Taskforce feeder items
                alert("This item is not a Taskforce feeder record. Please review it in the LitterBins (Twinbin) QC dashboard.");
                return;
            }
            // Refresh data (stay on same page)
            await loadData();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    const tabButton = (key: 'PENDING' | 'APPROVED' | 'ASSIGNED', label: string) => (
        <TabButton active={activeTab === key} onClick={() => setActiveTab(key)}>{label}</TabButton>
    );

    return (
        <div className="content">
            <header className="flex justify-between items-start mb-8">
                <div>
                    <p className="eyebrow">Module · Taskforce</p>
                    <h1>QC Dashboard</h1>
                    <div className="muted text-sm flex flex-col gap-1 mt-2">
                        <div className="flex gap-2">
                            <span className="font-semibold text-base-content w-16">Zones:</span>
                            <span>{scope?.zones?.length ? scope.zones.join(", ") : (scope ? "All" : "Loading...")}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold text-base-content w-16">Wards:</span>
                            <span>{scope?.wards?.length ? scope.wards.join(", ") : (scope ? "All" : "Loading...")}</span>
                        </div>
                    </div>
                </div>
                <div className="badge badge-warning">QC Access</div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-5 gap-4 mb-8">
                <KpiCard label="Total In Scope" value={stats?.total || 0} />
                <KpiCard label="Pending Review" value={stats?.pending || 0} color="text-warning" highlight />
                <KpiCard label="Approved" value={stats?.approved || 0} color="text-success" />
                <KpiCard label="Rejected" value={stats?.rejected || 0} color="text-error" />
                <KpiCard label="Action Req" value={stats?.actionRequired || 0} />
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg">Records Review</h2>
                    <div className="flex gap-2">
                        {tabButton('PENDING', 'Pending')}
                        {tabButton('APPROVED', 'Approved')}
                        {tabButton('ASSIGNED', 'Assigned')}
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
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
                            {loading ? (
                                // SKELETON LOADER
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-base-100">
                                        <td className="p-3"><div className="skeleton w-20 h-4 rounded"></div></td>
                                        <td className="p-3">
                                            <div className="skeleton w-32 h-4 rounded mb-1"></div>
                                            <div className="skeleton w-24 h-3 rounded"></div>
                                        </td>
                                        <td className="p-3"><div className="skeleton w-24 h-4 rounded"></div></td>
                                        <td className="p-3"><div className="skeleton w-16 h-5 rounded-full"></div></td>
                                        <td className="p-3"><div className="skeleton w-20 h-4 rounded"></div></td>
                                        <td className="p-3"><div className="skeleton w-16 h-6 rounded ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="border-b border-base-100 hover:bg-base-50">
                                        <td className="p-3 font-medium text-xs">
                                            {r.type === 'FEEDER_POINT' ? 'Feeder Point' : 'Report'}
                                        </td>
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
                                            {activeTab === 'PENDING' && (
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
                                            {(activeTab === 'APPROVED' || activeTab === 'ASSIGNED') && (
                                                <div className="flex justify-end gap-2">
                                                    <select
                                                        className="select select-xs select-bordered"
                                                        value={selectedEmployee[r.id] || ""}
                                                        onChange={(e) => setSelectedEmployee((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                                    >
                                                        <option value="">Select employee</option>
                                                        {employees.map((emp) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.name || emp.email} ({emp.id})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        className="btn btn-xs btn-primary"
                                                        disabled={!!actionLoading}
                                                        onClick={async () => {
                                                            const employeeId = selectedEmployee[r.id] || employees[0]?.id;
                                                            if (!employeeId) {
                                                                alert("Select an employee to assign");
                                                                return;
                                                            }
                                                            setActionLoading(r.id);
                                                            try {
                                                                await TaskforceApi.assignFeederPoint(r.id, employeeId);
                                                                await loadData();
                                                            } catch (err) {
                                                                alert("Assign failed");
                                                            } finally {
                                                                setActionLoading(null);
                                                            }
                                                        }}
                                                    >
                                                        {actionLoading === r.id ? '...' : 'Assign Team Member'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!loading && records.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center muted">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="p-4 border-t border-base-200 flex items-center justify-between">
                    <div className="text-sm muted">
                        Showing {records.length === 0 ? 0 : ((page - 1) * limit) + 1} – {Math.min(page * limit, meta?.total || 0)} of {meta?.total || 0} records
                    </div>
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => p - 1)}
                        >
                            « Prev
                        </button>
                        <button className="join-item btn btn-sm btn-ghost cursor-default">
                            Page {page} of {meta?.totalPages || 1}
                        </button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={!meta || page >= meta.totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next »
                        </button>
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
    if (status === "PENDING_QC" || status === "SUBMITTED" || status === "PENDING") style = "bg-warning/10 text-warning";
    if (status === "REJECTED") style = "bg-error/10 text-error";
    if (status === "ACTION_REQUIRED") style = "bg-info/10 text-info";

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${style}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}
