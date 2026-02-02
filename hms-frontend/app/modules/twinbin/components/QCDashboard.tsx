'use client';

import { useEffect, useState, useMemo, useRef } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError, AuthApi, EmployeesApi, apiFetch } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function QCDashboard() {
    const { user: authUser } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'DAILY_REPORTS' | 'BIN_REQUESTS' | 'APPROVED_BINS' | 'HISTORY'>('BIN_REQUESTS');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; actionRequired: number; total: number } | null>(null);

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [scope, setScope] = useState<{
        zones: string[];
        wards: string[];
        zoneIds: string[];
        wardIds: string[]
    } | null>(null);

    // Modal States
    const [viewRecord, setViewRecord] = useState<any | null>(null);
    const [assignRecord, setAssignRecord] = useState<any | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    // Cache reference to avoid excessive fetching if we wanted to implement sophisticated caching, 
    // but for now we trust standard SWR-like behavior (useEffect fetch). 
    // We fetch on Tab or Page change.

    async function loadData() {
        setLoading(true);
        try {
            const meRes = await AuthApi.getMe();
            const user = meRes.user;
            const cityId = user.cityId || authUser?.cityId;

            // STRICT SCOPE: Only use LITTERBINS module scope. No city fallback.
            const moduleScope = user.modules?.find((m: any) => m.key === 'LITTERBINS' || m.key === 'twinbin');
            const zoneIds: string[] = moduleScope?.zoneIds || [];
            const wardIds: string[] = moduleScope?.wardIds || [];

            // Resolve Names (Manual Fetch) - Only resolve if scope changed (optimization opportunity, but kept simple)
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
                    zones: resolvedZoneNames.length > 0 ? resolvedZoneNames : (zoneIds.length > 0 ? ["Ids: " + zoneIds.length] : ["No Zone Scope"]),
                    wards: resolvedWardNames.length > 0 ? resolvedWardNames : (wardIds.length > 0 ? ["Ids: " + wardIds.length] : ["No Ward Scope"])
                });
            }

            // Fetch Records with Pagination & Tab
            const filters = {
                zoneIds: zoneIds.length ? zoneIds : undefined,
                wardIds: wardIds.length ? wardIds : undefined,
                page,
                limit,
                tab: activeTab,
                fromDate: activeTab === 'DAILY_REPORTS' ? fromDate : undefined,
                toDate: activeTab === 'DAILY_REPORTS' ? toDate : undefined
            };

            const response = await ModuleRecordsApi.getRecords("twinbin", filters) as any;

            // Handle new response structure { data, meta, stats }
            // Stats might be missing in generic response, but we added it to backend
            setRecords(response.data || []);
            setMeta(response.meta || { total: 0, totalPages: 1 });
            if (response.stats) {
                setStats(response.stats);
            }

        } catch (err) {
            console.error("QCDashboard: Fatal load error", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadEmployees() {
        if (employees.length > 0) return;
        setEmployeesLoading(true);
        try {
            const res = await EmployeesApi.list("LITTERBINS");
            setEmployees(res.employees || []);
        } catch (err) {
            alert("Failed to load employees");
        } finally {
            setEmployeesLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [activeTab, page, fromDate, toDate]);

    // Reset page when tab changes
    const handleTabChange = (tab: typeof activeTab) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            setPage(1);
        }
    };

    async function handleApprove(record: any) {
        if (!confirm("Are you sure you want to Approve this request?")) return;
        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REGISTRATION') {
                await TwinbinApi.approve(record.id, {});
            } else if (record.type === 'VISIT_REPORT') {
                await TwinbinApi.approveVisit(record.id);
            }
            await loadData();
            setViewRecord(null);
        } catch (err) {
            alert("Approval failed: " + (err instanceof ApiError ? err.message : "Error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(record: any) {
        if (!confirm("Are you sure you want to Reject this request?")) return;
        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REGISTRATION') {
                await TwinbinApi.reject(record.id);
            } else if (record.type === 'VISIT_REPORT') {
                await TwinbinApi.rejectVisit(record.id);
            }
            await loadData();
            setViewRecord(null);
        } catch (err) {
            alert("Rejection failed: " + (err instanceof ApiError ? err.message : "Error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleAssign() {
        if (!assignRecord || !selectedEmployeeId) return;
        setActionLoading(assignRecord.id);
        try {
            await TwinbinApi.assign(assignRecord.id, { assignedEmployeeIds: [selectedEmployeeId] });
            await loadData();
            setAssignRecord(null);
            setSelectedEmployeeId("");
        } catch (err) {
            alert("Assignment failed: " + (err instanceof ApiError ? err.message : "Error"));
        } finally {
            setActionLoading(null);
        }
    }

    function openAssignModal(record: any) {
        setAssignRecord(record);
        loadEmployees();
    }

    // Filter employees for the selected bin's zone/ward
    const eligibleEmployees = useMemo(() => {
        if (!assignRecord) return [];
        return employees.filter(e => {
            if (assignRecord.zoneName) {
                // EmployeesApi returns zone names in 'zones' array
                if (!e.zones?.includes(assignRecord.zoneName)) return false;
            }
            return true;
        });
    }, [employees, assignRecord]);


    function getRecordLabel(type: string) {
        if (type === 'VISIT_REPORT') return 'Daily Report';
        if (type === 'BIN_REGISTRATION') return 'Bin Request';
        if (type === 'CITIZEN_REPORT') return 'Citizen Complaint';
        return type?.replace(/_/g, " ");
    }

    // STRICT SCOPE CHECK Helper
    function canAssign(record: any) {
        if (record.type !== 'BIN_REGISTRATION') return { allowed: false, reason: "Not a bin" };
        if (record.status !== 'APPROVED') return { allowed: false, reason: "Must be approved" };

        if (!scope) return { allowed: false, reason: "Loading scope..." };
        if (!record.zoneId || !record.wardId) return { allowed: false, reason: "Incomplete bin location data" };

        const inZone = scope.zoneIds.includes(record.zoneId);
        const inWard = scope.wardIds.includes(record.wardId);

        if (!inZone) return { allowed: false, reason: "Bin outside your QC Zone scope" };
        if (!inWard) return { allowed: false, reason: "Bin outside your QC Ward scope" };

        return { allowed: true, reason: "" };
    }

    if (!stats && loading && records.length === 0) return <div className="p-8 text-center muted">Loading QC Dashboard...</div>;

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
                <KpiCard label="Total In Scope" value={stats?.total || 0} />
                <KpiCard label="Pending Review" value={stats?.pending || 0} color="text-warning" highlight />
                <KpiCard label="Approved" value={stats?.approved || 0} color="text-success" />
                <KpiCard label="Rejected" value={stats?.rejected || 0} color="text-error" />
                <KpiCard label="Action Req" value={stats?.actionRequired || 0} />
            </div>

            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg">Records Review</h2>
                    <div className="flex gap-2 items-center">
                        {activeTab === 'DAILY_REPORTS' && (
                            <div className="flex gap-2 items-center mr-4">
                                <input
                                    type="date"
                                    className="input input-sm input-bordered"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <span className="text-xs muted">to</span>
                                <input
                                    type="date"
                                    className="input input-sm input-bordered"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        )}
                        <TabButton active={activeTab === 'DAILY_REPORTS'} onClick={() => handleTabChange('DAILY_REPORTS')}>Daily Reports</TabButton>
                        <TabButton active={activeTab === 'BIN_REQUESTS'} onClick={() => handleTabChange('BIN_REQUESTS')}>Bin Requests</TabButton>
                        <TabButton active={activeTab === 'APPROVED_BINS'} onClick={() => handleTabChange('APPROVED_BINS')}>Approved Bins</TabButton>
                        <TabButton active={activeTab === 'HISTORY'} onClick={() => handleTabChange('HISTORY')}>History</TabButton>
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
                                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-20 animate-pulse"></div></td>
                                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-32 animate-pulse mb-1"></div><div className="h-3 bg-base-200 rounded w-24 animate-pulse"></div></td>
                                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-20 animate-pulse"></div></td>
                                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-16 animate-pulse"></div></td>
                                        <td className="p-3"><div className="h-4 bg-base-200 rounded w-24 animate-pulse"></div></td>
                                        <td className="p-3"></td>
                                    </tr>
                                ))
                            ) : (
                                records.map((r) => {
                                    const assignmentCheck = canAssign(r);
                                    return (
                                        <tr key={r.id} className="border-b border-base-100 hover:bg-base-50">
                                            <td className="p-3 font-medium">
                                                <span className={`badge badge-sm ${r.type === 'VISIT_REPORT' ? 'badge-neutral' : 'badge-outline'}`}>
                                                    {getRecordLabel(r.type)}
                                                </span>
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
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        className="btn btn-xs btn-ghost border border-base-300"
                                                        onClick={() => setViewRecord(r)}
                                                    >
                                                        View
                                                    </button>

                                                    {(r.status === 'PENDING_QC' || r.status === 'PENDING') && (
                                                        <>
                                                            <button
                                                                className="btn btn-xs btn-success"
                                                                disabled={!!actionLoading}
                                                                onClick={() => handleApprove(r)}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                className="btn btn-xs btn-error"
                                                                disabled={!!actionLoading}
                                                                onClick={() => handleReject(r)}
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {r.status === 'APPROVED' && r.type === 'BIN_REGISTRATION' && (
                                                        <div className="tooltip tooltip-left" data-tip={!assignmentCheck.allowed ? assignmentCheck.reason : "Assign Employee"}>
                                                            <button
                                                                className="btn btn-xs btn-primary"
                                                                disabled={!assignmentCheck.allowed}
                                                                onClick={() => openAssignModal(r)}
                                                            >
                                                                Assign
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
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

            {/* VIEW MODAL (unchanged logic, just re-rendering) */}
            {viewRecord && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-3xl">
                        <h3 className="font-bold text-lg mb-4 flex justify-between">
                            <span>{getRecordLabel(viewRecord.type)} Details</span>
                            <StatusBadge status={viewRecord.status} />
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <h4 className="font-semibold text-sm muted mb-1">Location</h4>
                                <p>{viewRecord.areaName}</p>
                                <p className="text-sm">{viewRecord.locationName}</p>
                                <p className="text-xs muted">{viewRecord.zoneName} / {viewRecord.wardName}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm muted mb-1">Metadata</h4>
                                <p className="text-sm">Created: {new Date(viewRecord.createdAt).toLocaleString()}</p>
                                <p className="text-sm">ID: <span className="font-mono text-xs">{viewRecord.id}</span></p>
                            </div>
                        </div>

                        {/* TYPE SPECIFIC DETAILS */}
                        {viewRecord.type === 'VISIT_REPORT' && (
                            <div className="bg-base-200 p-4 rounded-lg">
                                <h4 className="font-bold mb-4">Daily Report Details</h4>

                                {viewRecord.questionnaire ? (
                                    <div className="flex flex-col gap-3 mb-4">
                                        {Object.entries(viewRecord.questionnaire).map(([key, val]: any, idx) => (
                                            <div key={idx} className="border-b border-base-300/50 pb-2 last:border-0">
                                                <p className="font-medium text-sm text-base-content/70">{val?.question || key}</p>
                                                <p className="text-sm font-semibold">{val?.answer || (typeof val === 'string' ? val : JSON.stringify(val))}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm muted italic mb-4">No questionnaire data available.</p>
                                )}

                                {/* IMAGE GALLERY */}
                                {(viewRecord.images || viewRecord.photos) && (
                                    <div>
                                        <h5 className="font-bold text-xs uppercase muted mb-2">Attached Images</h5>
                                        <div className="flex gap-2 flex-wrap">
                                            {(viewRecord.images || viewRecord.photos).map((img: string, idx: number) => (
                                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="group relative">
                                                    <img
                                                        src={img}
                                                        alt={`Evidence ${idx + 1}`}
                                                        className="w-24 h-24 object-cover rounded-lg border border-base-300 shadow-sm transition-transform group-hover:scale-105"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {viewRecord.distanceMeters && (
                                    <div className="mt-4 pt-2 border-t border-base-300/50">
                                        <p className="text-xs muted">Distance from bin: <span className="font-mono">{Math.round(viewRecord.distanceMeters)}m</span></p>
                                    </div>
                                )}
                            </div>
                        )}
                        {viewRecord.type === 'BIN_REGISTRATION' && (
                            <div className="bg-base-200 p-4 rounded-lg">
                                <h4 className="font-bold mb-2">Bin Request Details</h4>
                                <p className="text-sm">Road Type: {viewRecord.roadType || 'N/A'}</p>
                                <p className="text-sm">Condition: {viewRecord.condition || 'N/A'}</p>
                            </div>
                        )}

                        <div className="modal-action justify-between">
                            <button className="btn" onClick={() => setViewRecord(null)}>Close</button>
                            <div className="flex gap-2">
                                {(viewRecord.status === 'PENDING_QC' || viewRecord.status === 'PENDING') && (
                                    <>
                                        <button className="btn btn-error" onClick={() => handleReject(viewRecord)}>Reject</button>
                                        <button className="btn btn-success" onClick={() => handleApprove(viewRecord)}>Approve</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN MODAL (unchanged) */}
            {assignRecord && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Assign Bin to Employee</h3>
                        <p className="mb-4 text-sm">
                            Assigning bin at <b>{assignRecord.areaName}</b> ({assignRecord.zoneName})
                        </p>

                        {employeesLoading ? (
                            <div className="py-4 text-center">Loading employees...</div>
                        ) : (
                            <div className="form-control w-full">
                                <label className="label">
                                    <span className="label-text">Select Employee</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                >
                                    <option value="" disabled>Choose an employee...</option>
                                    {eligibleEmployees.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.name} ({e.email})
                                        </option>
                                    ))}
                                </select>
                                <label className="label">
                                    <span className="label-text-alt text-warning">
                                        Only showing employees with LITTERBINS access.
                                    </span>
                                </label>
                            </div>
                        )}

                        <div className="modal-action">
                            <button className="btn" onClick={() => { setAssignRecord(null); setSelectedEmployeeId(""); }}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                disabled={!selectedEmployeeId || !!actionLoading}
                                onClick={handleAssign}
                            >
                                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents unchanged
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
