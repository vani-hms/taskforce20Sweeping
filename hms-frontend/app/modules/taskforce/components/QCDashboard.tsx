'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TaskforceApi, ApiError, AuthApi, apiFetch, EmployeesApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { StatsCard, RecordsTable, StatusBadge, ActionButtons, TableColumn } from "../../qc-shared";

type TaskforceRecord = {
    id: string;
    type: 'FEEDER_POINT' | 'FEEDER_REPORT';
    status: string;
    areaName?: string;
    locationName?: string;
    zoneId?: string;
    wardId?: string;
    zoneName?: string;
    wardName?: string;
    createdAt: string;
    assignedEmployeeIds?: string[];
};

export default function TaskforceQCDashboard() {
    const { user: authUser } = useAuth();

    const [viewTab, setViewTab] = useState<'dashboard' | 'verification'>('dashboard');
    const [records, setRecords] = useState<TaskforceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ASSIGNED'>('PENDING');
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; actionRequired: number; total: number; assigned: number } | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [assignSelection, setAssignSelection] = useState<Record<string, string>>({});
    const [selectedRecord, setSelectedRecord] = useState<TaskforceRecord | null>(null);
    const [showEmployees, setShowEmployees] = useState(false);

    const [scope, setScope] = useState<{
        zones: string[];
        wards: string[];
        zoneIds: string[];
        wardIds: string[];
    } | null>(null);

    // Ensure verification view always shows pending queue
    useEffect(() => {
        if (viewTab === 'verification' && activeTab !== 'PENDING') {
            setActiveTab('PENDING');
        }
    }, [viewTab, activeTab]);

    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [activeTab, page]);

    async function resolveScope() {
        try {
            const meRes = await AuthApi.getMe();
            const user = meRes.user;
            const cityId = user.cityId || authUser?.cityId;

            const moduleScope = user.modules?.find((m: any) => m.key === 'TASKFORCE');
            const zoneIds: string[] = moduleScope?.zoneIds || [];
            const wardIds: string[] = moduleScope?.wardIds || [];

            if (scope) return { zoneIds, wardIds };

            let resolvedZoneNames: string[] = [];
            let resolvedWardNames: string[] = [];
            if (cityId && zoneIds.length > 0) {
                try {
                    const zonesRes = await apiFetch<{ zones: { id: string; name: string }[] }>(`/public/cities/${cityId}/zones`);
                    resolvedZoneNames = zonesRes.zones?.filter(z => zoneIds.includes(z.id)).map(z => z.name) || [];

                    const wardPromises = zoneIds.map(zId =>
                        apiFetch<{ wards: { id: string; name: string }[] }>(`/public/zones/${zId}/wards`)
                    );
                    const wardResponses = await Promise.all(wardPromises);
                    const allWards = wardResponses.flatMap(r => r.wards || []);
                    resolvedWardNames = allWards.filter(w => wardIds.includes(w.id)).map(w => w.name);
                } catch (nameErr) {
                    console.error("QCDashboard: Name resolution failed", nameErr);
                }
            }

            setScope({
                zoneIds,
                wardIds,
                zones: resolvedZoneNames.length > 0 ? resolvedZoneNames : (zoneIds.length > 0 ? ["Ids: " + zoneIds.length] : []),
                wards: resolvedWardNames.length > 0 ? resolvedWardNames : (wardIds.length > 0 ? ["Ids: " + wardIds.length] : [])
            });

            return { zoneIds, wardIds };
        } catch (err) {
            console.error("Failed to resolve scope", err);
            return { zoneIds: [], wardIds: [] };
        }
    }

    async function loadEmployeesOnce() {
        if (employees.length > 0) return;
        try {
            const empRes = await EmployeesApi.list("TASKFORCE");
            setEmployees(empRes.employees || []);
        } catch (empErr) {
            console.error("Failed to load employees", empErr);
        }
    }

    async function openEmployeesModal() {
        await loadEmployeesOnce();
        setShowEmployees(true);
    }

    async function loadData() {
        setLoading(true);
        try {
            const { zoneIds, wardIds } = await resolveScope();
            await loadEmployeesOnce();

            // Fetch all buckets once for accurate KPI counts
            const [pendingRes, approvedRes, assignedRes] = await Promise.all([
                TaskforceApi.pendingFeederPoints(),
                TaskforceApi.approvedFeederPoints(false),
                TaskforceApi.approvedFeederPoints(true)
            ]);

            const pending = (pendingRes.feederPoints || []).map(mapFeederPoint);
            const approved = (approvedRes.feederPoints || []).map(mapFeederPoint);
            const assigned = (assignedRes.feederPoints || []).map(mapFeederPoint);

            const kpi = {
                pending: pending.length,
                approved: approved.length,
                assigned: assigned.length,
                rejected: 0,
                actionRequired: 0,
                total: pending.length + approved.length + assigned.length
            };
            setStats(kpi);

            let dataset: TaskforceRecord[] = pending;
            if (activeTab === 'APPROVED') dataset = approved;
            if (activeTab === 'ASSIGNED') dataset = assigned;

            const filteredByScope = dataset.filter((r) => {
                const matchZone = zoneIds.length ? zoneIds.includes(r.zoneId || "") : true;
                const matchWard = wardIds.length ? wardIds.includes(r.wardId || "") : true;
                return matchZone && matchWard;
            });

            setRecords(filteredByScope);

            if (selectedRecord) {
                const stillExists = filteredByScope.find(r => r.id === selectedRecord.id);
                if (!stillExists) setSelectedRecord(null);
            }
        } catch (err) {
            console.error("Failed to load records", err);
        } finally {
            setLoading(false);
        }
    }

    const derivedStats = useMemo(() => {
        if (stats) return stats;
        const counts = records.reduce(
            (acc, r) => {
                if (r.status === 'ASSIGNED') acc.assigned++;
                else if (r.status === 'APPROVED') acc.approved++;
                else if (r.status === 'REJECTED') acc.rejected++;
                else acc.pending++;
                return acc;
            },
            { pending: 0, approved: 0, rejected: 0, assigned: 0 }
        );
        const total = counts.pending + counts.approved + counts.rejected + counts.assigned;
        return { ...counts, actionRequired: 0, total };
    }, [stats, records]);

    async function handleAction(record: TaskforceRecord, action: 'APPROVE' | 'REJECT') {
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
                alert("Unsupported record type for Taskforce QC.");
            }
            await loadData();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleAssign(record: TaskforceRecord, employeeId?: string) {
        const targetId = employeeId || assignSelection[record.id] || employees[0]?.id;
        if (!targetId) {
            alert("Select an employee to assign");
            return;
        }
        setActionLoading(record.id);
        try {
            await TaskforceApi.assignFeederPoint(record.id, targetId);
            await loadData();
        } catch (err) {
            alert("Assign failed");
        } finally {
            setActionLoading(null);
        }
    }

    const columns: TableColumn<TaskforceRecord>[] = [
        {
            key: 'record',
            label: 'Record',
            render: (r) => (
                <div>
                    <div className="font-semibold text-sm">{r.type === 'FEEDER_POINT' ? 'Feeder Point' : 'Feeder Report'}</div>
                    <div className="muted text-xs">{r.areaName || r.locationName || '—'}</div>
                </div>
            )
        },
        {
            key: 'zone',
            label: 'Zone / Ward',
            render: (r) => (
                <div className="text-xs">
                    <div>{r.zoneName || '—'}</div>
                    <div className="muted">{r.wardName || '—'}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.status} />
        },
        {
            key: 'date',
            label: 'Submitted',
            render: (r) => (
                <div className="text-xs muted">
                    {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            )
        }
    ];

    const displayRows = useMemo(() => {
        if (viewTab === 'verification') {
            return records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED');
        }
        return records;
    }, [records, viewTab]);

    const pagedRows = useMemo(() => {
        const start = (page - 1) * limit;
        return displayRows.slice(start, start + limit);
    }, [displayRows, page, limit]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(displayRows.length / limit)), [displayRows.length, limit]);

    const totalRecords = displayRows.length;
    const startRow = totalRecords === 0 ? 0 : ((page - 1) * limit) + 1;
    const endRow = Math.min(page * limit, totalRecords);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages, page]);

    const actionsRenderer = (r: TaskforceRecord) => (
        <ActionButtons
            status={r.status}
            onView={() => setSelectedRecord(r)}
            onApprove={() => handleAction(r, 'APPROVE')}
            onReject={() => handleAction(r, 'REJECT')}
            onAssign={(empId) => handleAssign(r, empId)}
            assignOptions={employees}
            assignValue={assignSelection[r.id] || ""}
            onAssignChange={(val) => setAssignSelection(prev => ({ ...prev, [r.id]: val }))}
            loading={actionLoading === r.id}
        />
    );

    return (
        <div className="content">
            <section className="card card-spacious mb-6">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Module - Taskforce</p>
                        <h1 className="text-2xl font-bold mb-1">QC Dashboard</h1>
                        <div className="muted text-sm flex flex-col gap-1">
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
                    <div className="section-actions">
                        <button className="btn btn-outline" onClick={openEmployeesModal}>
                            Employees
                        </button>
                        <button
                            className={`btn ${viewTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setViewTab('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={`btn ${viewTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setViewTab('verification')}
                        >
                            Verification
                        </button>
                        <div className="badge badge-warning">QC Access</div>
                    </div>
                </div>
                <div className="stats-row">
                    <StatsCard label="Pending Review" value={derivedStats.pending || 0} sub="Feeder Points" color="#d97706" />
                    <StatsCard label="Approved" value={derivedStats.approved || 0} sub="Feeder Points" color="#16a34a" />
                    <StatsCard label="Rejected" value={derivedStats.rejected || 0} sub="Feeder Points" color="#ef4444" />
                    <StatsCard label="Assigned" value={derivedStats.assigned || 0} sub="Eliminated Feeder Point" color="#6366f1" />
                    <StatsCard label="Total In Scope" value={derivedStats.total || 0} sub="Partially Eliminated" color="#0f172a" />
                </div>
            </section>

            <section className="card card-spacious">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg">Records Review</h2>
                        <p className="muted text-sm mb-0">Feeder points and reports within your scope.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className={`btn btn-sm ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab('PENDING')}
                        >
                            Pending
                        </button>
                        <button
                            className={`btn btn-sm ${activeTab === 'APPROVED' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab('APPROVED')}
                        >
                            Approved
                        </button>
                        <button
                            className={`btn btn-sm ${activeTab === 'ASSIGNED' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab('ASSIGNED')}
                        >
                            Assigned
                        </button>
                    </div>
                </div>

                <RecordsTable<TaskforceRecord>
                    rows={pagedRows}
                    columns={columns}
                    loading={loading}
                    emptyMessage={viewTab === 'verification' ? "All clear! No pending requests." : "No records found"}
                    renderActions={actionsRenderer}
                    onRowClick={(r) => setSelectedRecord(r)}
                />

                <div className="p-4 border-t border-base-200 flex items-center justify-between">
                    <div className="text-sm muted">Showing {startRow} - {endRow} of {totalRecords} records</div>
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            « Prev
                        </button>
                        <button className="join-item btn btn-sm btn-ghost cursor-default">Page {page} of {totalPages}</button>
                        <button
                            className="join-item btn btn-sm"
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next »
                        </button>
                    </div>
                </div>
            </section>

            {viewTab === 'verification' && selectedRecord && (
                <section className="card mt-6" style={{ borderLeft: '4px solid #1d4ed8' }}>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="muted text-xs">Selected Record</p>
                            <h3 className="text-lg font-semibold mb-1">
                                {selectedRecord.type === 'FEEDER_POINT' ? 'Feeder Point' : 'Feeder Report'}
                            </h3>
                            <p className="muted text-sm mb-0">{selectedRecord.areaName || selectedRecord.locationName || '—'}</p>
                        </div>
                        <button className="btn btn-sm" onClick={() => setSelectedRecord(null)}>×</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <InfoItem label="Zone" value={selectedRecord.zoneName || '—'} />
                        <InfoItem label="Ward" value={selectedRecord.wardName || '—'} />
                        <InfoItem label="Status" value={<StatusBadge status={selectedRecord.status} />} />
                        <InfoItem
                            label="Submitted"
                            value={`${new Date(selectedRecord.createdAt).toLocaleDateString()} ${new Date(selectedRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        />
                    </div>

                    <ActionButtons
                        status={selectedRecord.status}
                        onApprove={() => handleAction(selectedRecord, 'APPROVE')}
                        onReject={() => handleAction(selectedRecord, 'REJECT')}
                        onAssign={(empId) => handleAssign(selectedRecord, empId)}
                        assignOptions={employees}
                        assignValue={assignSelection[selectedRecord.id] || ""}
                        onAssignChange={(val) => setAssignSelection(prev => ({ ...prev, [selectedRecord.id]: val }))}
                        loading={actionLoading === selectedRecord.id}
                    />
                </section>
            )}

            {showEmployees && (
                <div className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-4xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg">Assigned Employees</h3>
                            <button className="btn btn-sm" onClick={() => setShowEmployees(false)}>
                                Close
                            </button>
                        </div>

                        {employees.length === 0 ? (
                            <div className="muted text-sm">No employees found for this module.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Modules</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((e) => (
                                            <tr key={e.id}>
                                                <td>{e.name}</td>
                                                <td>{e.email}</td>
                                                <td>{(e.modules || []).map((m: any) => m.name || m.key).join(", ") || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="muted text-xs uppercase tracking-wide">{label}</span>
            <span className="font-semibold text-sm">{value}</span>
        </div>
    );
}

function mapFeederPoint(p: any): TaskforceRecord {
    return {
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
    };
}
