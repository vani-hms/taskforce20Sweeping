import { useEffect, useState } from 'react';
import { ApiError, ToiletApi } from '@lib/apiClient';
import Link from 'next/link';

export default function ReportsTab() {
    const [stats, setStats] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateFilter, setDateFilter] = useState('today');

    useEffect(() => {
        loadReports();
    }, [dateFilter]);

    const loadReports = async () => {
        setLoading(true);
        setError('');
        try {
            const statsRes = await ToiletApi.getDashboardStats();
            setStats(statsRes);

            // Fetch recent inspections for the table
            const inspectionsRes = await ToiletApi.listInspections();
            setReports(inspectionsRes.inspections || []);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setError('Not authorized for Cleanliness of Toilets module.');
            } else {
                setError('Failed to load dashboard data.');
            }
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = stats && 'todayInspections' in stats;

    return (
        <div className="reports-tab">
            {isAdmin ? (
                <div className="admin-dashboard">
                    <div className="stats-compact-grid">
                        <StatCard label="INSPECTIONS SUBMITTED TODAY" value={stats.todayInspections} sub="Daily Report Count" color="#3b82f6" />
                        <StatCard label="NEW TOILETS ADDED TODAY" value={stats.todayRegistrations} sub="New Assets Registered" color="#10b981" />
                        <StatCard label="TOTAL TOILETS MANAGED" value={stats.totalToilets} sub="City-wide Assets" color="#6366f1" />
                        <StatCard label="ACTIVE STAFF MEMBERS" value={stats.onDutyEmployees} sub="Currently On Duty" color="#f59e0b" />
                    </div>

                    <div className="stats-compact-grid mt-4">
                        <StatCard label="COVERAGE (ZONES/WARDS)" value={stats.totalZones + stats.totalWards} sub={`${stats.totalZones} Zones, ${stats.totalWards} Wards`} color="#64748b" />
                        <StatCard label="TOTAL APPROVED REPORTS" value={stats.approvedInspections} sub="Lifetime Approved" color="#059669" />
                        <StatCard label="TOTAL REJECTED REPORTS" value={stats.rejectedInspections} sub="Lifetime Rejected" color="#dc2626" />
                        <StatCard label="PENDING QC VERIFICATION" value={stats.pendingReview} sub="Awaiting Review" color="#d97706" />
                    </div>
                </div>
            ) : (
                <div className="employee-dashboard">
                    <div className="tab-filters mb-4">
                        {['today', 'week', 'month'].map(f => (
                            <button key={f} className={`btn btn-sm ${dateFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter(f)}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {stats && stats[dateFilter] && (
                        <div className="stats-compact-grid">
                            <StatCard label="SUBMITTED" value={stats[dateFilter].submitted} sub="Reports" color="#3b82f6" />
                            <StatCard label="APPROVED" value={stats[dateFilter].approved} sub="By QC" color="#10b981" />
                            <StatCard label="REJECTED" value={stats[dateFilter].rejected} sub="By QC" color="#ef4444" />
                            <StatCard label="PENDING" value={stats[dateFilter].actionRequired} sub="Needs Review" color="#f59e0b" />
                        </div>
                    )}
                </div>
            )}

            <div className="section-divider my-6"></div>

            {loading && <div className="loading-state"><p>Syncing dashboard...</p></div>}
            {error && <div className="alert error">{error}</div>}

            {!loading && !error && (
                <div className="card compact-card">
                    <div className="card-header-flex">
                        <h3 className="section-title">Latest Cleanliness Inspections</h3>
                        <Link href="/modules/toilet/inspection" className="text-link text-sm font-bold">View All →</Link>
                    </div>

                    <div className="table-responsive">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Asset Name</th>
                                    <th>Employee</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.length > 0 ? reports.map((report) => (
                                    <tr key={report.id}>
                                        <td className="font-bold">{report.toilet?.name || '---'}</td>
                                        <td>{report.employee?.name || '---'}</td>
                                        <td className="muted text-xs">
                                            {new Date(report.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(report.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            <StatusBadge status={report.status} />
                                        </td>
                                        <td>
                                            <Link href={`/modules/toilet/inspection/${report.id}`} target="_blank" className="btn btn-xs btn-outline">
                                                📄 Full Report
                                            </Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="text-center py-8 muted">No inspections found for this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style jsx>{`
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
                }
                .compact-card {
                    padding: 20px;
                }
                .tab-filters {
                    display: flex;
                    gap: 8px;
                }
                .text-link {
                    color: #3b82f6;
                    text-decoration: none;
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    text-align: left;
                    font-size: 12px;
                    color: #64748b;
                    padding: 12px 8px;
                    border-bottom: 2px solid #f1f5f9;
                }
                .modern-table td {
                    padding: 12px 8px;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                }
            `}</style>
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="card stat-card-compact" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-sub">{sub}</div>
            <style jsx>{`
                .stat-card-compact {
                    padding: 12px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .stat-label {
                    font-size: 10px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.05em;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 900;
                }
                .stat-sub {
                    font-size: 12px;
                    color: #64748b;
                }
            `}</style>
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
