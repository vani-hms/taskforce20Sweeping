import { useEffect, useState } from "react";
import { ToiletApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function ApprovalsTab() {
    const { user } = useAuth();
    const [pendingActions, setPendingActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    useEffect(() => {
        loadPending();
    }, [user]);

    const loadPending = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const actions: any[] = [];

            // 1. Fetch Pending Toilets (for QC and CITY_ADMIN)
            try {
                if (user.roles.includes('QC') || user.roles.includes('CITY_ADMIN') || user.roles.includes('HMS_SUPER_ADMIN')) {
                    const res = await ToiletApi.listPendingToilets();
                    const toilets = (res.toilets || []).map((t: any) => ({ ...t, _type: 'REGISTRATION' }));
                    actions.push(...toilets);
                }
            } catch (e) {
                console.error("Failed to fetch pending toilets:", e);
            }

            // 2. Fetch Submitted Inspections (for QC and CITY_ADMIN)
            try {
                if (user.roles.includes('QC') || user.roles.includes('CITY_ADMIN') || user.roles.includes('HMS_SUPER_ADMIN')) {
                    // Fetch ALL and filter client-side to ensure no query param issues
                    const res = await ToiletApi.listInspections();
                    const allInspections = res.inspections || [];
                    const submitted = allInspections.filter((i: any) => i.status === 'SUBMITTED');

                    const enriched = submitted.map((i: any) => ({ ...i, _type: 'INSPECTION' }));
                    actions.push(...enriched);
                }
            } catch (e) {
                console.error("Failed to fetch submitted inspections:", e);
            }

            // 3. Fetch Action Required Inspections (for ACTION_OFFICER)
            try {
                if (user.roles.includes('ACTION_OFFICER') || user.roles.includes('CITY_ADMIN') || user.roles.includes('HMS_SUPER_ADMIN')) {
                    // We can reuse the same list logic if optimized, but for now duplicate to be safe
                    const res = await ToiletApi.listInspections();
                    const allInspections = res.inspections || [];
                    const actionRequired = allInspections.filter((i: any) => i.status === 'ACTION_REQUIRED');

                    const enriched = actionRequired.map((i: any) => ({ ...i, _type: 'INSPECTION' }));
                    actions.push(...enriched);
                }
            } catch (e) {
                console.error("Failed to fetch action required inspections:", e);
            }

            // Sort by date desc
            actions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Deduplicate (in case user has multiple roles that fetch overlapping items)
            const uniqueActions = actions.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

            setPendingActions(uniqueActions);
        } catch (err) {
            console.error("General error in loadPending:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: string, isInspection = false) => {
        try {
            if (!isInspection) {
                if (status === 'APPROVED') await ToiletApi.approveToilet(id);
                else {
                    const reason = prompt("Enter rejection reason:");
                    if (reason === null) return;
                    await ToiletApi.rejectToilet(id, reason || "Rejected by QC");
                }
            } else {
                // Inspection Review
                let comment = '';
                if (status === 'ACTION_REQUIRED' || status === 'REJECTED') {
                    comment = prompt(status === 'ACTION_REQUIRED' ? "Enter instructions for Action Officer:" : "Enter action taken notes (will be sent back to employee):") || '';
                    if (comment === null) return;
                }
                await ToiletApi.reviewInspection(id, { status, comment });
            }
            alert("Action successful");
            setSelectedRequest(null);
            await loadPending();
        } catch (err: any) {
            alert(err.message || "Action failed");
        }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading your verification inbox...</div>;

    const isRegistration = (req: any) => req._type === 'REGISTRATION';
    const isInspection = (req: any) => req._type === 'INSPECTION';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedRequest ? '1fr 450px' : '1fr', gap: 24, transition: 'all 0.3s' }}>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0 }}>🔔 Verification & Approvals Inbox</h3>
                    <span className="badge" style={{ backgroundColor: '#1d4ed8', color: '#fff' }}>
                        {pendingActions.length} Pending Actions
                    </span>
                </div>

                <div className="table-responsive">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Asset / Detail</th>
                                <th>Submitted By</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingActions.map(req => (
                                <tr
                                    key={req.id}
                                    className={selectedRequest?.id === req.id ? 'active-row' : ''}
                                    onClick={() => setSelectedRequest(req)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <span className={`status-pill ${isRegistration(req) ? 'reg' : 'ins'}`}>
                                            {isRegistration(req) ? 'REG' : 'INS'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="font-bold">{isRegistration(req) ? req.name : req.toilet?.name}</div>
                                        <div className="muted text-xs">{req.toilet?.type || req.type}</div>
                                    </td>
                                    <td className="text-sm">{isRegistration(req) ? req.requestedBy?.name : req.employee?.name}</td>
                                    <td>
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td>
                                        <div className="flex gap-1">
                                            <button className="btn btn-xs btn-primary" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}>Review</button>
                                            {isInspection(req) && (
                                                <a href={`/modules/toilet/inspection/${req.id}`} target="_blank" className="btn btn-xs btn-outline" onClick={e => e.stopPropagation()}>📄 Report</a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pendingActions.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-12 muted">🎉 All clear! No pending requests.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRequest && (
                <div className="card" style={{ borderLeft: '4px solid #1d4ed8', position: 'sticky', top: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 style={{ margin: 0 }}>{isRegistration(selectedRequest) ? 'Registration Details' : 'Inspection Report'}</h4>
                        <button className="btn btn-sm" onClick={() => setSelectedRequest(null)}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                            <div className="muted small" style={{ marginBottom: 4 }}>REQUEST TYPE</div>
                            <div style={{ fontWeight: 800, color: '#1d4ed8' }}>
                                {isRegistration(selectedRequest) ? 'NEW TOILET REGISTRATION' : 'TOILET CLEANLINESS INSPECTION'}
                            </div>
                        </div>

                        {/* Registration Details */}
                        {isRegistration(selectedRequest) && (
                            <>
                                <div>
                                    <div className="muted small">ASSET INFORMATION</div>
                                    <div style={{ marginTop: 8 }}>
                                        <p style={{ marginBottom: 8 }}><strong>Name:</strong> {selectedRequest.name}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Code:</strong> {selectedRequest.code || 'N/A'}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Type:</strong> {selectedRequest.type}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Gender:</strong> {selectedRequest.gender}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Submitted By:</strong> {selectedRequest.requestedBy?.name}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAction(selectedRequest.id, 'APPROVED')}>Approve</button>
                                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleAction(selectedRequest.id, 'REJECTED')}>Reject</button>
                                </div>
                            </>
                        )}

                        {/* Inspection Details */}
                        {isInspection(selectedRequest) && (
                            <>
                                <div>
                                    <div className="muted small">INSPECTION SUMMARY</div>
                                    <div style={{ marginTop: 8 }}>
                                        <p style={{ marginBottom: 8 }}><strong>Toilet:</strong> {selectedRequest.toilet?.name}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Employee:</strong> {selectedRequest.employee?.name}</p>
                                        <p style={{ marginBottom: 8 }}><strong>Distance:</strong> {Math.round(selectedRequest.distanceMeters || 0)}m from asset</p>

                                        {/* Audit Trail */}
                                        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 12, border: '1px solid #e0f2fe' }}>
                                            <div className="muted small font-bold" style={{ marginBottom: 8 }}>AUDIT TRAIL</div>
                                            {selectedRequest.reviewedByQc && (
                                                <p style={{ fontSize: 13, marginBottom: 4 }}>
                                                    🔍 <strong>Reviewed By QC/Admin:</strong> {selectedRequest.reviewedByQc.name}
                                                </p>
                                            )}
                                            {selectedRequest.actionTakenBy && (
                                                <p style={{ fontSize: 13, marginBottom: 4 }}>
                                                    ⚠️ <strong>Action Taken By:</strong> {selectedRequest.actionTakenBy.name}
                                                </p>
                                            )}
                                            {selectedRequest.qcComment && (
                                                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#fff7ed', borderRadius: 6, fontSize: 12, color: '#9a3412' }}>
                                                    <strong>QC Instructions:</strong> {selectedRequest.qcComment}
                                                </div>
                                            )}
                                            {selectedRequest.actionNote && (
                                                <div style={{ marginTop: 4, padding: 8, backgroundColor: '#ecfdf5', borderRadius: 6, fontSize: 12, color: '#065f46' }}>
                                                    <strong>Action Notes:</strong> {selectedRequest.actionNote}
                                                </div>
                                            )}
                                            {!selectedRequest.reviewedByQc && !selectedRequest.actionTakenBy && (
                                                <p style={{ fontSize: 12, fontStyle: 'italic', color: '#94a3b8' }}>No review audit yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="muted small">TOILET INSPECTION QUESTIONS</div>
                                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {selectedRequest.answers && Object.entries(selectedRequest.answers).map(([qId, val]: [string, any]) => {
                                            // Handle new answer format `{ answer: '...', photos: [...] }`
                                            const isNewFormat = val && typeof val === 'object' && 'answer' in val;
                                            const displayVal = isNewFormat ? val.answer : val;

                                            return (
                                                <div key={qId} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                                                    <span>{qId}:</span>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {displayVal === true || displayVal === 'YES' ? '✅ YES' :
                                                            displayVal === false || displayVal === 'NO' ? '❌ NO' :
                                                                (typeof displayVal === 'object' ? JSON.stringify(displayVal) : displayVal)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                    {/* Action Buttons Restricted to QC/AO roles, City Admin only views if purely City Admin */}
                                    {(user?.roles.includes('QC') || user?.roles.includes('HMS_SUPER_ADMIN')) && selectedRequest.status === 'SUBMITTED' && (
                                        <>
                                            <button className="btn btn-primary btn-sm" style={{ flex: '1 0 45%', backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleAction(selectedRequest.id, 'APPROVED', true)}>✅ Approve</button>
                                            <button className="btn btn-secondary btn-sm" style={{ flex: '1 0 45%', backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white' }} onClick={() => handleAction(selectedRequest.id, 'REJECTED', true)}>✕ Reject</button>
                                            <button className="btn btn-outline btn-sm" style={{ flex: '1 0 100%', borderColor: '#f59e0b', color: '#d97706', marginTop: 8 }} onClick={() => handleAction(selectedRequest.id, 'ACTION_REQUIRED', true)}>⚠️ Action Required</button>
                                        </>
                                    )}

                                    {user?.roles.includes('ACTION_OFFICER') && selectedRequest.status === 'ACTION_REQUIRED' && (
                                        <>
                                            <button className="btn btn-primary btn-sm" style={{ flex: '1 0 45%' }} onClick={() => handleAction(selectedRequest.id, 'APPROVED', true)}>No Action Needed (Approve)</button>
                                            <button className="btn btn-secondary btn-sm" style={{ flex: '1 0 45%', backgroundColor: '#dc2626' }} onClick={() => handleAction(selectedRequest.id, 'REJECTED', true)}>Action Taken (Resolve)</button>
                                        </>
                                    )}

                                    {user?.roles.includes('CITY_ADMIN') && !user?.roles.includes('QC') && !user?.roles.includes('ACTION_OFFICER') && isInspection(selectedRequest) && (
                                        <div style={{ width: '100%', padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
                                            ℹ️ Only QC and Action Officers can review inspections.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .table-responsive { overflow-x: auto; }
                .modern-table { width: 100%; border-collapse: collapse; }
                .modern-table th { text-align: left; font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 12px 8px; border-bottom: 2px solid #f1f5f9; }
                .modern-table td { padding: 12px 8px; border-bottom: 1px solid #f1f5f9; }
                .active-row { background-color: #f8fafc; border-left: 4px solid #1d4ed8 !important; }
                .status-pill { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 900; }
                .status-pill.reg { background: #dcfce7; color: #166534; }
                .status-pill.ins { background: #eff6ff; color: #1e40af; }
                .badge-submitted { background-color: #dbeafe; color: #1e40af; }
                .badge-action_required { background-color: #ffedd5; color: #9a3412; }
                .badge-approved { background-color: #dcfce7; color: #166534; }
                .badge-rejected { background-color: #fee2e2; color: #991b1b; }
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
