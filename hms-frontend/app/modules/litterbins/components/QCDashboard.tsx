'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError, apiFetch } from "@lib/apiClient";
import { StatsCard, RecordsTable, StatusBadge, ActionButtons, TableColumn } from "../../qc-shared";

type RecordItem = {
    id: string;
    type: string; // normalized: BIN_REQUEST or DAILY_REPORT
    rawType?: string;
    status: string;
    actionStatus?: string;
    currentOwnerRole?: string;
    areaName?: string;
    locationName?: string;
    zoneName?: string;
    wardName?: string;
    createdAt: string;
    bin?: any;
};

export default function QCDashboard() {
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'ALL' | 'BIN_REQUEST' | 'DAILY_REPORT'>('ALL');
    const [viewItem, setViewItem] = useState<RecordItem | any | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    // Employee Assignment
    const [employees, setEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignRecord, setAssignRecord] = useState<RecordItem | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

    useEffect(() => {
        loadRecords();
        loadEmployees();
    }, []);

    async function loadEmployees() {
        try {
            // Assuming Twinbin module employees. 
            // If generic, might need to list all or filter by module.
            // Using "twinbin" (lowercase) or "LITTERBINS" depending on how backend expects it.
            // Backend usually expects normalized key. Let's try "LITTERBINS" first or check what other calls use.
            // router.ts uses "LITTERBINS". 
            // Using "twinbin" (lowercase) to match the records call and likely backend canonical key
            const res = await apiFetch<{ employees: any[] }>("/city/employees?moduleKey=twinbin");
            setEmployees(res.employees || []);
        } catch (err) {
            console.error("Failed to load employees", err);
        }
    }
    async function loadRecords() {
        setLoading(true);
        try {
            const res = await ModuleRecordsApi.getRecords("twinbin") as any;
            const mapped = (res.data || []).map((r: any) => {
                const isBinRequest = r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST';
                const normalizedType = isBinRequest ? 'BIN_REQUEST' : 'DAILY_REPORT';
                return {
                    ...r,
                    rawType: r.type,
                    type: normalizedType,
                    // Ensure actionStatus is preserved
                    actionStatus: r.actionStatus,
                    currentOwnerRole: r.currentOwnerRole
                };
            });
            setRecords(mapped);
        } catch (err) {
            console.error("Failed to load QC records", err);
        } finally {
            setLoading(false);
        }
    }

    const stats = useMemo(() => {
        const counts = records.reduce(
            (acc, r) => {
                if (r.actionStatus === 'ACTION_REQUIRED' || r.actionStatus === 'ACTION_TAKEN') acc.actionRequired++;
                else if (r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED') acc.pending++;
                else if (r.status === 'APPROVED') acc.approved++;
                else if (r.status === 'REJECTED') acc.rejected++;
                return acc;
            },
            { pending: 0, approved: 0, rejected: 0, actionRequired: 0 }
        );
        return { ...counts, total: records.length };
    }, [records]);

    const filteredRecords = useMemo(() => {
        const matchesType = (r: RecordItem) => {
            if (filterType === 'ALL') return true;
            // If filter is specific, match raw type mapped?
            // Actually currently: 'BIN_REQUEST', 'DAILY_REPORT'
            return r.type === filterType;
        };

        let result = records.filter(matchesType);

        if (filterType === 'DAILY_REPORT' && (fromDate || toDate)) {
            const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
            const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            result = result.filter(r => {
                const ts = new Date(r.createdAt).getTime();
                return ts >= from && ts <= to;
            });
        }
        return result;
    }, [records, filterType, fromDate, toDate]);

    async function handleAction(record: RecordItem, action: 'APPROVE' | 'REJECT' | 'ACTION_REQUIRED', assignedEmployeeIds?: string[]) {
        let remark = "";
        if (action === 'ACTION_REQUIRED' && record.type === 'VISIT_REPORT') {
            remark = prompt("Enter remark for Action Officer:") || "";
            if (!remark) return;
        } else if (action === 'APPROVE' && record.type === 'BIN_REQUEST' && !assignedEmployeeIds) {
            // If no IDs passed (called from direct button without modal), open modal
            openAssignModal(record);
            return;
        } else {
            if (!assignedEmployeeIds && !confirm(`Are you sure you want to ${action.toLowerCase()} this item?`)) return;
        }

        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REQUEST') {
                if (action === 'APPROVE') await TwinbinApi.approveBinRequest(record.id, { assignedEmployeeIds });
                else if (action === 'REJECT') await TwinbinApi.rejectBinRequest(record.id);
            } else if (record.type === 'VISIT_REPORT') {
                if (action === 'APPROVE') await TwinbinApi.approveVisit(record.id);
                else if (action === 'REJECT') await TwinbinApi.rejectVisit(record.id);
                else if (action === 'ACTION_REQUIRED') await TwinbinApi.markActionRequired(record.id, { qcRemark: remark });
            } else {
                if (action === 'APPROVE') await TwinbinApi.approveReport(record.id);
                else if (action === 'REJECT') await TwinbinApi.rejectReport(record.id);
                else if (action === 'ACTION_REQUIRED') await TwinbinApi.actionRequiredReport(record.id);
            }
            await loadRecords();
            setAssignModalOpen(false);
            if (viewItem?.id === record.id) setViewItem(null); // Close view if active
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    function openAssignModal(record: RecordItem) {
        setAssignRecord(record);
        setSelectedEmployeeId("");
        setAssignModalOpen(true);
    }

    function confirmAssign() {
        if (!assignRecord) return;
        handleAction(assignRecord, 'APPROVE', selectedEmployeeId ? [selectedEmployeeId] : []);
    }

    async function openView(record: RecordItem) {
        if (record.type === 'BIN_REQUEST') {
            setViewItem(record);
            return;
        }
        setViewLoading(true);
        try {
            let res: { data?: any[] } | null = null;
            const status = record.status;
            if (status === 'APPROVED') res = await TwinbinApi.approvedReports();
            else if (status === 'REJECTED') res = await TwinbinApi.rejectedReports();
            else if (status === 'ACTION_REQUIRED') res = await TwinbinApi.actionRequiredReports();
            else res = await TwinbinApi.pendingReports();
            const found = res?.data?.find((r: any) => r.id === record.id);
            setViewItem(found || record);
        } catch (err) {
            setViewItem(record);
        } finally {
            setViewLoading(false);
        }
    }

    const columns: TableColumn<RecordItem>[] = [
        {
            key: 'type',
            label: 'Type',
            render: (r) => <span className="font-semibold text-xs">{readableType(r.type)}</span>
        },
        {
            key: 'location',
            label: 'Location',
            render: (r) => (
                <div>
                    <div className="font-semibold text-sm">{r.areaName || '-'}</div>
                    <div className="muted text-xs">{r.locationName || '-'}</div>
                </div>
            )
        },
        {
            key: 'zone',
            label: 'Zone / Ward',
            render: (r) => (
                <div className="text-xs">
                    <div>{r.zoneName || '-'}</div>
                    <div className="muted">{r.wardName || '-'}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.actionStatus === 'ACTION_REQUIRED' || r.actionStatus === 'ACTION_TAKEN' ? r.actionStatus : r.status} />
        },
        {
            key: 'date',
            label: 'Date',
            render: (r) => (
                <div className="text-xs muted">
                    {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            )
        }
    ];

    // Updated actionsRenderer to separate View and Assign for Bin Requests
    const actionsRenderer = (r: RecordItem) => (
        <div className="flex justify-end gap-2">
            <button className="btn btn-xs btn-outline" onClick={() => openView(r)}>View</button>
            {r.type === 'BIN_REQUEST' && (
                <>
                    {(r.status === 'PENDING_QC' || r.status === 'APPROVED' || r.status === 'PENDING') && (
                        <button className="btn btn-xs btn-primary" onClick={() => openAssignModal(r)}>
                            {r.status === 'APPROVED' ? 'Reassign' : 'Assign'}
                        </button>
                    )}
                    {r.status !== 'APPROVED' && r.status !== 'REJECTED' && (
                        <button className="btn btn-xs btn-error" onClick={() => handleAction(r, 'REJECT')}>Reject</button>
                    )}
                </>
            )}
            {r.type !== 'BIN_REQUEST' && (
                <ActionButtons
                    status={r.actionStatus === 'ACTION_TAKEN' ? 'ACTION_TAKEN' : r.status}
                    // onView handled manually above
                    // If Action Taken, QC has "no right to check", so no Approve/Reject actions.
                    onApprove={r.actionStatus === 'ACTION_TAKEN' ? undefined : () => handleAction(r, 'APPROVE')}
                    onReject={r.actionStatus === 'ACTION_TAKEN' ? undefined : () => handleAction(r, 'REJECT')}
                    onActionRequired={r.type === 'DAILY_REPORT' || r.type === 'VISIT_REPORT' ? () => handleAction(r, 'ACTION_REQUIRED') : undefined}
                    loading={actionLoading === r.id}
                />
            )}
        </div>
    );

    return (
        <div className="content">
            {/* ... (keep stats and filter sections) */}
            <section className="card mb-6">
                {/* Header ... */}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="eyebrow">Module - Litter Bins</p>
                        <h1 className="text-2xl font-bold mb-1">QC Dashboard</h1>
                        <p className="muted text-sm mb-0">Unified queue: bin requests and daily reports.</p>
                    </div>
                    <div className="badge badge-warning">QC Access</div>
                </div>
            </section>

            <section className="grid grid-5 gap-4 mb-6">
                <StatsCard label="Pending Review" value={stats.pending} sub="In your scope" color="#d97706" />
                <StatsCard label="Approved" value={stats.approved} sub="Cleared" color="#16a34a" />
                <StatsCard label="Rejected" value={stats.rejected} sub="Sent back" color="#ef4444" />
                <StatsCard label="Action Required" value={stats.actionRequired} sub="Needs follow-up" color="#0284c7" />
                <StatsCard label="Total In Scope" value={stats.total} sub="All items" color="#0f172a" />
            </section>

            {/* Filter Section ... (keep as is) */}
            <section className="card mb-4">
                {/* ... filters ... */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg">Filter by Type</h2>
                        {/* ... */}
                    </div>
                    <div className="flex gap-2">
                        <button className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('ALL')}>All</button>
                        <button className={`btn btn-sm ${filterType === 'BIN_REQUEST' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('BIN_REQUEST')}>Bin Requests</button>
                        <button className={`btn btn-sm ${filterType === 'DAILY_REPORT' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('DAILY_REPORT')}>Daily Reports</button>
                    </div>
                </div>
                {/* ... date inputs ... */}
                {filterType === 'DAILY_REPORT' && (
                    <div className="flex flex-wrap gap-3 mt-3">
                        <label className="flex items-center gap-2 text-sm">
                            From
                            <input type="date" className="input input-sm input-bordered" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            To
                            <input type="date" className="input input-sm input-bordered" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </label>
                        {(fromDate || toDate) && (
                            <button className="btn btn-sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button>
                        )}
                    </div>
                )}
            </section>

            <section className="card">
                <RecordsTable<RecordItem>
                    rows={filteredRecords}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No records found"
                    renderActions={actionsRenderer} // Use generic render
                />
            </section>

            {viewItem && (
                <section className="card mt-6" style={{ borderLeft: '4px solid #1d4ed8' }}>
                    {viewItem.type === 'BIN_REQUEST' ? (
                        <BinRequestView
                            item={viewItem}
                            onClose={() => setViewItem(null)}
                            onAssign={() => openAssignModal(viewItem)} // Pass assign handler
                        />
                    ) : (
                        <DailyReportView item={viewItem} loading={viewLoading} onClose={() => setViewItem(null)} />
                    )}
                </section>
            )}

            {/* Assign Modal */}
            {assignModalOpen && (
                <AssignModal
                    employees={employees}
                    record={assignRecord}
                    onClose={() => setAssignModalOpen(false)}
                    onAssign={(empId) => {
                        setSelectedEmployeeId(empId);
                        handleAction(assignRecord!, 'APPROVE', [empId]);
                    }}
                    loading={actionLoading === assignRecord?.id}
                />
            )}
        </div>
    );
}

function AssignModal({ employees, record, onClose, onAssign, loading }: {
    employees: { id: string; name: string; email: string; zones?: string[]; wards?: string[] }[];
    record: RecordItem | null;
    onClose: () => void;
    onAssign: (id: string) => void;
    loading?: boolean;
}) {
    const [selected, setSelected] = useState("");
    const displayedEmployees = useMemo(() => {
        if (!record) return [];
        const rZone = record.zoneName;

        return employees.filter(e => {
            return rZone && e.zones?.includes(rZone);
        });
    }, [employees, record]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">Assign Bin</h3>
                <p className="mb-4 text-sm">Select an employee to assign this bin to. This will also approve the request.</p>

                <div className="form-control w-full mb-4">
                    <label className="label">
                        <span className="label-text">Select Employee</span>
                    </label>
                    <select
                        className="select select-bordered w-full"
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                    >
                        <option value="">-- Choose Employee --</option>
                        {displayedEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.email})
                            </option>
                        ))}
                    </select>
                    {displayedEmployees.length === 0 && (
                        <div className="text-xs text-error mt-1">
                            No employees found in this zone.
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        disabled={!selected || loading}
                        onClick={() => onAssign(selected)}
                    >
                        {loading ? "Assigning..." : "Assign & Approve"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Update BinRequestView to take onAssign
function BinRequestView({ item, onClose, onAssign }: { item: any; onClose: () => void; onAssign: () => void }) {
    return (
        <>
            <div className="flex justify-between items-start mb-3">
                {/* ... header ... */}
                <div>
                    <p className="muted text-xs">Bin Request</p>
                    <h3 className="text-lg font-semibold mb-1">{item.areaName || item.locationName || '-'}</h3>
                    <p className="muted text-sm mb-0">
                        Submitted {new Date(item.createdAt).toLocaleString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    {(item.status === 'PENDING_QC' || item.status === 'APPROVED' || item.status === 'PENDING') && (
                        <button className="btn btn-sm btn-primary" onClick={onAssign}>
                            {item.status === 'APPROVED' ? 'Reassign' : 'Assign & Approve'}
                        </button>
                    )}
                    <button className="btn btn-sm" onClick={onClose}>x</button>
                </div>
            </div>

            {/* ... rest of the view ... */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoItem label="Zone" value={item.zoneName || item.bin?.zoneName || item.zoneId || '-'} />
                <InfoItem label="Ward" value={item.wardName || item.bin?.wardName || item.wardId || '-'} />
                <InfoItem label="Status" value={<StatusBadge status={item.status} />} />
                <InfoItem label="Type" value={readableType(item.type)} />
                {item.requestedBy && (
                    <InfoItem label="Requested By" value={item.requestedBy.name || item.requestedBy.email || '-'} />
                )}
                {item.locationName && <InfoItem label="Location" value={item.locationName} />}
            </div>

            <div className="mb-2">
                <h4 className="text-md font-semibold mb-2">Description</h4>
                <p className="muted text-sm">{item.description || "No description provided."}</p>
            </div>

            {Array.isArray(item.photos) && item.photos.length > 0 && (
                <div className="mb-2">
                    <h4 className="text-md font-semibold mb-2">Images</h4>
                    <div className="flex flex-wrap gap-2">
                        {item.photos.map((p: string, idx: number) => (
                            <a key={idx} href={p} target="_blank" rel="noreferrer">
                                <img src={p} alt={`Photo ${idx + 1}`} className="h-16 w-16 object-cover rounded border" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function DailyReportView({ item, loading, onClose }: { item: any; loading: boolean; onClose: () => void }) {
    return (
        <>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="muted text-xs">Daily Report</p>
                    <h3 className="text-lg font-semibold mb-1">{item.areaName || item.bin?.areaName || '-'}</h3>
                    <p className="muted text-sm mb-0">
                        Submitted {new Date(item.createdAt).toLocaleString()}
                    </p>
                </div>
                <button className="btn btn-sm" onClick={onClose}>x</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoItem label="Zone" value={item.zoneName || item.bin?.zoneName || item.zoneId || '-'} />
                <InfoItem label="Ward" value={item.wardName || item.bin?.wardName || item.wardId || '-'} />
                <InfoItem label="Status" value={<StatusBadge status={item.status} />} />
                <InfoItem label="Type" value={readableType(item.type)} />
                {item.submittedBy && (
                    <InfoItem label="Submitted By" value={item.submittedBy.name || item.submittedBy.email || '-'} />
                )}
                {item.locationName && <InfoItem label="Location" value={item.locationName} />}
            </div>

            <div className="mb-4">
                <h4 className="text-md font-semibold mb-2">Questionnaire</h4>
                <div className="grid gap-2">
                    {item.questionnaire
                        ? Object.entries(item.questionnaire).map(([key, val]: [string, any]) => {
                            const answer = typeof val === "object" && val !== null && "answer" in val ? (val as any).answer : val;
                            const photos = typeof val === "object" && (val as any).photos ? (val as any).photos : [];
                            return (
                                <div key={key} className="p-3 rounded border border-base-200 bg-base-50">
                                    <div className="text-sm font-semibold">{key}</div>
                                    <div className="muted text-sm">{String(answer ?? "-")}</div>
                                    {Array.isArray(photos) && photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {photos.map((p: string, idx: number) => (
                                                <a key={idx} href={p} target="_blank" rel="noreferrer" className="block">
                                                    <img src={p} alt={`Photo ${idx + 1}`} className="h-16 w-16 object-cover rounded border" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                        : <div className="muted text-sm">No questionnaire answers.</div>}
                </div>
            </div>

            {loading && <div className="muted text-sm">Loading details...</div>}
        </>
    );
}

function readableType(type: string) {
    if (type === 'BIN_REQUEST' || type === 'BIN_REGISTRATION') return 'Bin Request';
    if (type === 'DAILY_REPORT' || type === 'VISIT_REPORT' || type === 'CITIZEN_REPORT') return 'Daily Report';
    return (type || '').replace(/_/g, " ");
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="muted text-xs uppercase tracking-wide">{label}</span>
            <span className="font-semibold text-sm">{value}</span>
        </div>
    );
}
