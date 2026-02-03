import { useEffect, useState } from 'react';
import { ApiError, ToiletApi } from '@lib/apiClient';
import Link from 'next/link';

export default function ReportsTab() {
    const [stats, setStats] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        loadReports();
    }, [dateFilter, customDate]);

    const loadReports = async () => {
        setLoading(true);
        setError('');
        try {
            const params: any = {};
            if (dateFilter === 'custom' && customDate) {
                params.startDate = customDate;
            }
            const statsRes = await ToiletApi.getDashboardStats(params);
            setStats(statsRes);

            // Fetch recent inspections for the table
            const inspectionsRes = await ToiletApi.listInspections({ pageSize: 10 });
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
        <div className="reports-tab" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .date-picker-input {
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 800;
                    color: #1e293b;
                    outline: none;
                    cursor: pointer;
                    background: #f8fafc;
                    transition: all 0.2s;
                }
                .date-picker-input:focus {
                    border-color: #3b82f6;
                    background: #fff;
                }
            `}</style>

            {isAdmin ? (
                <div className="admin-dashboard">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Operational Intelligence</h2>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {['today', 'week', 'month'].map(f => (
                                <button
                                    key={f}
                                    className={`btn btn-sm ${dateFilter === f ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setDateFilter(f)}
                                    style={{ borderRadius: 10, fontSize: 11, fontWeight: 800 }}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', padding: '4px 10px', borderRadius: 12 }}>
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b' }}>📅 </span>
                                <input
                                    type="date"
                                    className="date-picker-input"
                                    value={customDate}
                                    onChange={(e) => {
                                        setCustomDate(e.target.value);
                                        setDateFilter('custom');
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {stats[dateFilter] ? (
                        <div className="stats-compact-grid">
                            <StatCard label={`${dateFilter === 'custom' ? customDate : dateFilter.toUpperCase()} SUBMISSIONS`} value={stats[dateFilter].submitted} sub="Total reports" color="#3b82f6" />
                            <StatCard label="APPROVED BY QC" value={stats[dateFilter].approved} sub="Status: Verified" color="#059669" />
                            <StatCard label="REJECTED BY QC" value={stats[dateFilter].rejected} sub="Status: Non-Compliant" color="#ef4444" />
                            <StatCard label="PENDING REVIEW" value={stats[dateFilter].actionRequired} sub="Status: Action Required" color="#f59e0b" />
                        </div>
                    ) : (
                        <div className="stats-compact-grid">
                            <StatCard label="INSPECTIONS TODAY" value={stats.todayInspections} sub="Total submissions" color="#3b82f6" />
                            <StatCard label="NEW ASSETS TODAY" value={stats.todayRegistrations} sub="Asset registration" color="#10b981" />
                            <StatCard label="ASSIGNED QC" value={stats.qcCount || 0} sub="Quality Control Team" color="#8b5cf6" />
                            <StatCard label="ASSIGNED AO" value={stats.aoCount || 0} sub="Action Officers" color="#f43f5e" />
                        </div>
                    )}

                    <div className="stats-compact-grid mt-4">
                        <StatCard label="TOTAL INFRASTRUCTURE" value={stats.totalToilets} sub="Verified Assets" color="#6366f1" />
                        <StatCard label="STAFF ON DUTY" value={stats.onDutyEmployees} sub="Active Personnel" color="#f59e0b" />
                        <StatCard label="TOTAL APPROVED" value={stats.approvedInspections} sub="Compliant records" color="#059669" />
                        <StatCard label="PENDING VERIFICATION" value={stats.pendingReview} sub="QC Queue" color="#d97706" />
                    </div>
                </div>
            ) : (
                <div className="employee-dashboard">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div className="tab-filters">
                            {['today', 'week', 'month'].map(f => (
                                <button key={f} className={`btn btn-sm ${dateFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDateFilter(f)} style={{ borderRadius: 10 }}>
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="date"
                                className="date-picker-input"
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    setDateFilter('custom');
                                }}
                            />
                        </div>
                    </div>

                    {stats && (stats[dateFilter] || stats.today) && (
                        <div className="stats-compact-grid">
                            <StatCard label="SUBMITTED" value={(stats[dateFilter] || stats.today).submitted} sub="Reports" color="#3b82f6" />
                            <StatCard label="APPROVED" value={(stats[dateFilter] || stats.today).approved} sub="By QC" color="#10b981" />
                            <StatCard label="REJECTED" value={(stats[dateFilter] || stats.today).rejected} sub="By QC" color="#ef4444" />
                            <StatCard label="PENDING" value={(stats[dateFilter] || stats.today).actionRequired} sub="Needs Review" color="#f59e0b" />
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
                                {reports.length > 0 ? reports.slice(0, 10).map((report) => (
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
                    color: #0f172a;
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
        <div className="card stat-card-compact" style={{ borderLeft: `6px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <div className="stat-label">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="stat-value" style={{ color: '#1e293b' }}>{value}</div>
            </div>
            <div className="stat-sub">{sub}</div>
            <style jsx>{`
                .stat-card-compact {
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    background: #ffffff;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .stat-card-compact:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                }
                .stat-label {
                    font-size: 10px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }
                .stat-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
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
