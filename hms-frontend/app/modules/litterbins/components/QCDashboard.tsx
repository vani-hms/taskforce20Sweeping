'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError } from "@lib/apiClient";
import { StatsCard, RecordsTable, StatusBadge, ActionButtons, TableColumn } from "../../qc-shared";

type RecordItem = {
    id: string;
    type: string; // normalized: BIN_REQUEST or DAILY_REPORT
    rawType?: string;
    status: string;
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

    useEffect(() => {
        loadRecords();
    }, []);

    async function loadRecords() {
        setLoading(true);
        try {
            const res = await ModuleRecordsApi.getRecords("twinbin") as any;
            const mapped = (res.data || []).map((r: any) => {
                const isBinRequest = r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST';
                const normalizedType = isBinRequest ? 'BIN_REQUEST' : 'DAILY_REPORT';
                return { ...r, rawType: r.type, type: normalizedType };
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
                if (r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED') acc.pending++;
                else if (r.status === 'APPROVED') acc.approved++;
                else if (r.status === 'REJECTED') acc.rejected++;
                else acc.actionRequired++;
                return acc;
            },
            { pending: 0, approved: 0, rejected: 0, actionRequired: 0 }
        );
        return { ...counts, total: records.length };
    }, [records]);

    const filteredRecords = useMemo(() => {
        if (filterType === 'ALL') return records;
        const byType = records.filter(r => r.type === filterType);
        if (filterType === 'DAILY_REPORT' && (fromDate || toDate)) {
            const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
            const to = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
            return byType.filter(r => {
                const ts = new Date(r.createdAt).getTime();
                return ts >= from && ts <= to;
            });
        }
        return byType;
    }, [records, filterType, fromDate, toDate]);

    async function handleAction(record: RecordItem, action: 'APPROVE' | 'REJECT' | 'ACTION_REQUIRED') {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this item?`)) return;
        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REQUEST') {
                if (action === 'APPROVE') await TwinbinApi.approve(record.id, {});
                else if (action === 'REJECT') await TwinbinApi.reject(record.id);
            } else if (record.type === 'VISIT_REPORT') {
                if (action === 'APPROVE') await TwinbinApi.approveVisit(record.id);
                else if (action === 'REJECT') await TwinbinApi.rejectVisit(record.id);
            } else {
                // Treat everything else as daily report
                if (action === 'APPROVE') await TwinbinApi.approveReport(record.id);
                else if (action === 'REJECT') await TwinbinApi.rejectReport(record.id);
                else await TwinbinApi.actionRequiredReport(record.id);
            }
            await loadRecords();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
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
            render: (r) => <StatusBadge status={r.status} />
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

    const actionsRenderer = (r: RecordItem) => (
        <ActionButtons
            status={r.status}
            onView={() => openView(r)}
            onApprove={r.type === 'DAILY_REPORT' ? () => handleAction(r, 'APPROVE') : undefined}
            onReject={r.type === 'DAILY_REPORT' ? () => handleAction(r, 'REJECT') : undefined}
            onActionRequired={r.type === 'DAILY_REPORT' ? () => handleAction(r, 'ACTION_REQUIRED') : undefined}
            loading={actionLoading === r.id}
        />
    );

    return (
        <div className="content">
            <section className="card mb-6">
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

            <section className="card mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg">Filter by Type</h2>
                        <p className="muted text-sm mb-0">Show all, only bin requests, or only daily reports.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className={`btn btn-sm ${filterType === 'ALL' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('ALL')}>All</button>
                        <button className={`btn btn-sm ${filterType === 'BIN_REQUEST' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('BIN_REQUEST')}>Bin Requests</button>
                        <button className={`btn btn-sm ${filterType === 'DAILY_REPORT' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('DAILY_REPORT')}>Daily Reports</button>
                    </div>
                </div>
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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg">Pending Requests</h2>
                        <p className="muted text-sm mb-0">Mixed queue with type labels.</p>
                    </div>
                </div>

                <RecordsTable<RecordItem>
                    rows={filteredRecords}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No records found"
                    renderActions={actionsRenderer}
                />
            </section>

            {viewItem && (
                <section className="card mt-6" style={{ borderLeft: '4px solid #1d4ed8' }}>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="muted text-xs">{viewItem.type === 'BIN_REQUEST' ? 'Bin Request' : 'Daily Report'}</p>
                            <h3 className="text-lg font-semibold mb-1">{viewItem.areaName || viewItem.bin?.areaName || '-'}</h3>
                            <p className="muted text-sm mb-0">
                                {readableType(viewItem.type)} | {new Date(viewItem.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <button className="btn btn-sm" onClick={() => setViewItem(null)}>x</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <InfoItem label="Zone" value={viewItem.zoneName || viewItem.bin?.zoneName || viewItem.zoneId || viewItem.bin?.zoneId || '-'} />
                        <InfoItem label="Ward" value={viewItem.wardName || viewItem.bin?.wardName || viewItem.wardId || viewItem.bin?.wardId || '-'} />
                        <InfoItem label="Status" value={<StatusBadge status={viewItem.status} />} />
                        <InfoItem label="Type" value={readableType(viewItem.type)} />
                        {viewItem.submittedBy && (
                            <InfoItem label="Submitted By" value={viewItem.submittedBy.name || viewItem.submittedBy.email || viewItem.submittedBy.id || '-'} />
                        )}
                        {viewItem.locationName && <InfoItem label="Location" value={viewItem.locationName} />}
                    </div>

                    {viewItem.type === 'DAILY_REPORT' && (
                        <div className="mb-4">
                            <h4 className="text-md font-semibold mb-2">Questionnaire</h4>
                            <div className="grid gap-2">
                                {viewItem.questionnaire
                                    ? Object.entries(viewItem.questionnaire).map(([key, val]: [string, any]) => {
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
                    )}

                    {viewLoading && <div className="muted text-sm">Loading details...</div>}
                </section>
            )}
        </div>
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
