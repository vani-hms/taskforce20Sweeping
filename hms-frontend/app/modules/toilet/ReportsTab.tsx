import { useEffect, useState } from 'react';
import { ApiError, ToiletApi } from '@lib/apiClient';

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
            const inspectionsRes = await ToiletApi.listInspections({ status: 'SUBMITTED' });

            const allInspections = inspectionsRes.inspections || [];
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const calculateStats = (startDate: Date) => {
                const filtered = allInspections.filter((i: any) => new Date(i.createdAt) >= startDate);
                return {
                    submitted: filtered.length,
                    approved: filtered.filter((i: any) => i.status === 'APPROVED').length,
                    rejected: filtered.filter((i: any) => i.status === 'REJECTED').length,
                    actionRequired: filtered.filter((i: any) => i.status === 'SUBMITTED').length
                };
            };

            setStats({
                today: calculateStats(todayStart),
                week: calculateStats(weekStart),
                month: calculateStats(monthStart)
            });

            setReports(allInspections.slice(0, 20));
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setError('Not authorized for Toilet module.');
            } else {
                setError('Failed to load reports.');
            }
        } finally {
            setLoading(false);
        }
    };

    const currentStats = dateFilter === 'today' ? stats?.today : dateFilter === 'week' ? stats?.week : stats?.month;

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
                <button
                    className={`btn ${dateFilter === 'today' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setDateFilter('today')}
                >
                    Today
                </button>
                <button
                    className={`btn ${dateFilter === 'week' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setDateFilter('week')}
                >
                    This Week
                </button>
                <button
                    className={`btn ${dateFilter === 'month' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setDateFilter('month')}
                >
                    This Month
                </button>
            </div>

            {!loading && currentStats && (
                <div className="grid grid-4" style={{ marginBottom: 32 }}>
                    <div className="card" style={{ borderLeft: '6px solid #3b82f6' }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 900 }}>SUBMITTED</div>
                        <h2 style={{ margin: '8px 0', color: '#3b82f6' }}>{currentStats.submitted}</h2>
                        <div className="muted" style={{ fontSize: 13 }}>Total Reports</div>
                    </div>
                    <div className="card" style={{ borderLeft: '6px solid #10b981' }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 900 }}>APPROVED</div>
                        <h2 style={{ margin: '8px 0', color: '#10b981' }}>{currentStats.approved}</h2>
                        <div className="muted" style={{ fontSize: 13 }}>QC Approved</div>
                    </div>
                    <div className="card" style={{ borderLeft: '6px solid #ef4444' }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 900 }}>REJECTED</div>
                        <h2 style={{ margin: '8px 0', color: '#ef4444' }}>{currentStats.rejected}</h2>
                        <div className="muted" style={{ fontSize: 13 }}>QC Rejected</div>
                    </div>
                    <div className="card" style={{ borderLeft: '6px solid #f59e0b' }}>
                        <div className="muted" style={{ fontSize: 11, fontWeight: 900 }}>ACTION REQUIRED</div>
                        <h2 style={{ margin: '8px 0', color: '#f59e0b' }}>{currentStats.actionRequired}</h2>
                        <div className="muted" style={{ fontSize: 13 }}>Pending Review</div>
                    </div>
                </div>
            )}

            {loading && <div className="card"><p>Loading reports...</p></div>}
            {error && <div className="alert error">{error}</div>}

            {!loading && !error && reports.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: 20, fontSize: 18, fontWeight: 800 }}>Recent Inspections</h3>
                    <div className="table-grid">
                        <div className="table-head">
                            <div>Date</div>
                            <div>Time</div>
                            <div>Toilet</div>
                            <div>Employee</div>
                            <div>Status</div>
                        </div>
                        {reports.map((report: any) => (
                            <div key={report.id} className="table-row">
                                <div>{new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                <div>{new Date(report.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div style={{ fontWeight: 700 }}>{report.toilet?.name || 'N/A'}</div>
                                <div>{report.employee?.name || 'N/A'}</div>
                                <div>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        fontWeight: 900,
                                        backgroundColor: report.status === 'APPROVED' ? '#dcfce7' : report.status === 'REJECTED' ? '#fee2e2' : '#dbeafe',
                                        color: report.status === 'APPROVED' ? '#166534' : report.status === 'REJECTED' ? '#991b1b' : '#1e40af'
                                    }}>
                                        {report.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && !error && reports.length === 0 && (
                <div className="card">
                    <p className="muted">No inspection reports found.</p>
                </div>
            )}
        </div>
    );
}
