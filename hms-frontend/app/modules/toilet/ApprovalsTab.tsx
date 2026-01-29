'use client';

import { useEffect, useState } from "react";
import { ToiletApi } from "@lib/apiClient";

export default function ApprovalsTab() {
    const [pendingToilets, setPendingToilets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    useEffect(() => {
        loadPending();
    }, []);

    const loadPending = async () => {
        setLoading(true);
        try {
            const res = await ToiletApi.listPendingToilets();
            setPendingToilets(res.toilets || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, approve: boolean) => {
        try {
            if (approve) await ToiletApi.approveToilet(id);
            else {
                const reason = prompt("Enter rejection reason:");
                if (reason === null) return;
                await ToiletApi.rejectToilet(id, reason || "Rejected by QC");
            }
            alert("Action successful");
            setSelectedRequest(null);
            await loadPending();
        } catch (err: any) {
            alert(err.message || "Action failed");
        }
    };

    if (loading) return <div>Loading requests...</div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedRequest ? '1fr 400px' : '1fr', gap: 24, transition: 'all 0.3s' }}>
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0 }}>🔔 Verification & Approvals Inbox</h3>
                    <span className="badge" style={{ backgroundColor: '#1d4ed8', color: '#fff' }}>
                        {pendingToilets.length} Pending Actions
                    </span>
                </div>

                <div className="table-grid">
                    <div className="table-head">
                        <div>Request Type</div>
                        <div>Asset Name</div>
                        <div>Submitted By</div>
                        <div>Date</div>
                        <div>Actions</div>
                    </div>
                    {pendingToilets.map(t => (
                        <div
                            key={t.id}
                            className={`table-row ${selectedRequest?.id === t.id ? 'active-row' : ''}`}
                            style={{ cursor: 'pointer', backgroundColor: selectedRequest?.id === t.id ? '#f1f5f9' : 'transparent' }}
                            onClick={() => setSelectedRequest(t)}
                        >
                            <div>
                                <span style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#dcfce7',
                                    color: '#166534',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700
                                }}>NEW REGISTRATION</span>
                            </div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{t.name}</div>
                                <div className="muted small">{t.type} • {t.ward?.name}</div>
                            </div>
                            <div>{t.requestedBy?.name}</div>
                            <div className="muted small">{new Date(t.createdAt).toLocaleDateString()}</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={(e) => { e.stopPropagation(); setSelectedRequest(t); }}
                                >
                                    👁️ Review
                                </button>
                            </div>
                        </div>
                    ))}
                    {pendingToilets.length === 0 && (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <p className="muted">🎉 All clear! No pending requests to approve.</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedRequest && (
                <div className="card" style={{ borderLeft: '4px solid #1d4ed8', position: 'sticky', top: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h4 style={{ margin: 0 }}>Request Details</h4>
                        <button className="btn btn-sm" onClick={() => setSelectedRequest(null)}>✕</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                            <div className="muted small" style={{ marginBottom: 4 }}>REQUEST TYPE</div>
                            <div style={{ fontWeight: 800, color: '#1d4ed8' }}>NEW TOILET REGISTRATION</div>
                        </div>

                        <div>
                            <div className="muted small">ASSET INFORMATION</div>
                            <div style={{ marginTop: 8 }}>
                                <p style={{ marginBottom: 8 }}><strong>Name:</strong> {selectedRequest.name}</p>
                                <p style={{ marginBottom: 8 }}><strong>Code:</strong> {selectedRequest.code || 'N/A'}</p>
                                <p style={{ marginBottom: 8 }}><strong>Type:</strong> {selectedRequest.type}</p>
                                <p style={{ marginBottom: 8 }}><strong>Gender:</strong> {selectedRequest.gender}</p>
                                <p style={{ marginBottom: 8 }}><strong>Ward:</strong> {selectedRequest.ward?.name}</p>
                                <p style={{ marginBottom: 8 }}><strong>Admin Seats:</strong> {selectedRequest.numberOfSeats || 0}</p>
                            </div>
                        </div>

                        {selectedRequest.exteriorPhoto && (
                            <div>
                                <div className="muted small">EXTERIOR PHOTO</div>
                                <img
                                    src={`data:image/jpeg;base64,${selectedRequest.exteriorPhoto}`}
                                    alt="Toilet Exterior"
                                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginTop: 8 }}
                                />
                            </div>
                        )}

                        {selectedRequest.address && (
                            <div>
                                <div className="muted small">LOCATION & ADDRESS</div>
                                <p style={{ marginTop: 8, fontSize: 13 }}>{selectedRequest.address}</p>
                                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 11 }}>
                                    GPS: {selectedRequest.latitude}, {selectedRequest.longitude}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                            <button
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                onClick={() => handleAction(selectedRequest.id, true)}
                            >
                                ✓ Approve
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => handleAction(selectedRequest.id, false)}
                            >
                                ✗ Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .active-row {
                    border-left: 4px solid #1d4ed8 !important;
                }
            `}</style>
        </div>
    );
}
