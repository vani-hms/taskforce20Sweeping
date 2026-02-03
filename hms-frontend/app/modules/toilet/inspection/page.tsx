'use client';

import { useEffect, useState } from 'react';
import { ToiletApi } from '@lib/apiClient';
import Link from 'next/link';

export default function InspectionListPage() {
    const [inspections, setInspections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadInspections();
    }, [page, pageSize, statusFilter]);

    const loadInspections = async () => {
        setLoading(true);
        try {
            const res = await ToiletApi.listInspections({
                page,
                pageSize,
                status: statusFilter || undefined
            });
            setInspections(res.inspections || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div style={{ padding: 40, animation: 'fadeIn 0.4s' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .pagination-btn {
                    padding: 8px 16px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .pagination-btn:hover:not(:disabled) {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }
                .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .pagination-btn.active {
                    background: #3b82f6;
                    color: white;
                    border-color: #3b82f6;
                }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <Link href="/modules/toilet" style={{ fontSize: 13, fontWeight: 700, color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        ← Back to Dashboard
                    </Link>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Cleanliness Inspections</h1>
                    <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500, margin: '4px 0 0 0' }}>Showing {inspections.length} of {total} records</p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="ACTION_REQUIRED">Action Required</option>
                    </select>

                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                        style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 700, outline: 'none' }}
                    >
                        <option value="20">20 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                    </select>
                </div>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: 24, border: '1px solid #edf2f7', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                            {['Asset Name', 'Employee', 'Date & Time', 'Distance', 'Status', 'Actions'].map((h) => (
                                <th key={h} style={{ textAlign: 'left', padding: '16px 24px', fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: 100, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>Loading records...</td></tr>
                        ) : inspections.length > 0 ? inspections.map((report) => (
                            <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '16px 24px', fontWeight: 800, color: '#1e293b' }}>{report.toilet?.name || '---'}</td>
                                <td style={{ padding: '16px 24px', fontSize: 14, color: '#334155' }}>{report.employee?.name || '---'}</td>
                                <td style={{ padding: '16px 24px', fontSize: 13, color: '#64748b' }}>
                                    {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br />
                                    <span style={{ fontSize: 11 }}>{new Date(report.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td style={{ padding: '16px 24px', fontSize: 13, color: '#64748b' }}>
                                    {report.distanceMeters ? `${(report.distanceMeters).toFixed(1)}m` : '---'}
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <StatusBadge status={report.status} />
                                </td>
                                <td style={{ padding: '16px 24px' }}>
                                    <Link href={`/modules/toilet/inspection/${report.id}`} target="_blank" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#1e293b', textDecoration: 'none', background: '#f8fafc' }}>
                                        View Report
                                    </Link>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} style={{ padding: 100, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>No inspections found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                    <button
                        className="pagination-btn"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Prev
                    </button>

                    {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        if (p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)) {
                            return (
                                <button
                                    key={p}
                                    className={`pagination-btn ${page === p ? 'active' : ''}`}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            );
                        } else if (p === page - 3 || p === page + 3) {
                            return <span key={p} style={{ color: '#94a3b8' }}>...</span>;
                        }
                        return null;
                    })}

                    <button
                        className="pagination-btn"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'APPROVED': { bg: '#dcfce7', text: '#166534' },
        'REJECTED': { bg: '#fee2e2', text: '#991b1b' },
        'SUBMITTED': { bg: '#dbeafe', text: '#1e40af' },
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
            color: s.text
        }}>
            {status}
        </span>
    );
}
