'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ToiletApi } from '@lib/apiClient';

export default function InspectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const inspectionId = params.id as string;

    const [inspection, setInspection] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInspection();
    }, [inspectionId]);

    const loadInspection = async () => {
        try {
            const res = await ToiletApi.getInspectionDetails(inspectionId);
            setInspection(res.inspection);
        } catch (err: any) {
            setError(err.message || 'Failed to load inspection');
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (status: string) => {
        if (!confirm(`Are you sure you want to ${status} this inspection?`)) return;

        try {
            await ToiletApi.reviewInspection(inspectionId, status);
            alert(`Inspection ${status} successfully!`);
            window.close(); // Close the popup
        } catch (err: any) {
            alert(err.message || 'Failed to update status');
        }
    };

    if (loading) return <div className="page"><div className="card">Loading inspection details...</div></div>;
    if (error) return <div className="page"><div className="alert error">{error}</div></div>;
    if (!inspection) return <div className="page"><div className="card">Inspection not found</div></div>;

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto', padding: 40 }}>
            <div className="card">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>📋 Inspection Report</h1>
                        <p className="muted">Review and approve/reject this inspection</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => handleReview('APPROVED')}
                        >
                            ✓ Approve
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handleReview('REJECTED')}
                        >
                            ✗ Reject
                        </button>
                        <button
                            className="btn btn-outline"
                            onClick={() => handleReview('ACTION_REQUIRED')}
                        >
                            ⚠️ Action Required
                        </button>
                    </div>
                </div>

                {/* Inspection Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', marginBottom: 16 }}>TOILET INFORMATION</h3>
                        <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12 }}>
                            <p style={{ marginBottom: 12 }}><strong>Name:</strong> {inspection.toilet?.name}</p>
                            <p style={{ marginBottom: 12 }}><strong>Type:</strong> <span style={{ padding: '4px 12px', backgroundColor: inspection.toilet?.type === 'CT' ? '#dbeafe' : '#fef3c7', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{inspection.toilet?.type}</span></p>
                            <p style={{ marginBottom: 12 }}><strong>Ward:</strong> {inspection.toilet?.ward?.name}</p>
                            <p style={{ marginBottom: 12 }}><strong>Address:</strong> {inspection.toilet?.address || 'N/A'}</p>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#64748b', marginBottom: 16 }}>INSPECTION DETAILS</h3>
                        <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12 }}>
                            <p style={{ marginBottom: 12 }}><strong>Employee:</strong> {inspection.employee?.name}</p>
                            <p style={{ marginBottom: 12 }}><strong>Submitted:</strong> {new Date(inspection.createdAt).toLocaleString('en-IN')}</p>
                            <p style={{ marginBottom: 12 }}><strong>Status:</strong> <span style={{
                                padding: '4px 12px',
                                backgroundColor: inspection.status === 'APPROVED' ? '#dcfce7' : inspection.status === 'REJECTED' ? '#fee2e2' : '#dbeafe',
                                color: inspection.status === 'APPROVED' ? '#166534' : inspection.status === 'REJECTED' ? '#991b1b' : '#1e40af',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 700
                            }}>{inspection.status}</span></p>
                            <p style={{ marginBottom: 12 }}><strong>GPS Location:</strong> {inspection.latitude?.toFixed(6)}, {inspection.longitude?.toFixed(6)}</p>
                        </div>
                    </div>
                </div>

                {/* Questions & Answers */}
                <div style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Inspection Form Responses</h3>

                    {inspection.answers && inspection.answers.length > 0 ? (
                        <div style={{ display: 'grid', gap: 20 }}>
                            {inspection.answers.map((answer: any, index: number) => (
                                <div key={answer.id} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 4 }}>
                                                QUESTION {index + 1}
                                                {answer.question?.isCritical && <span style={{ marginLeft: 8, color: '#ef4444' }}>⚠️ CRITICAL</span>}
                                            </div>
                                            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{answer.question?.text}</h4>
                                        </div>
                                        <div style={{
                                            padding: '6px 16px',
                                            backgroundColor: answer.answer === 'YES' ? '#dcfce7' : '#fee2e2',
                                            color: answer.answer === 'YES' ? '#166534' : '#991b1b',
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontWeight: 800
                                        }}>
                                            {answer.answer}
                                        </div>
                                    </div>

                                    {answer.remarks && (
                                        <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
                                            <strong style={{ fontSize: 12, color: '#92400e' }}>Remarks:</strong>
                                            <p style={{ marginTop: 4, color: '#78350f' }}>{answer.remarks}</p>
                                        </div>
                                    )}

                                    {/* Photos */}
                                    {answer.photos && answer.photos.length > 0 && (
                                        <div style={{ marginTop: 16 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>PHOTOS ({answer.photos.length})</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                                                {answer.photos.map((photo: any) => (
                                                    <img
                                                        key={photo.id}
                                                        src={photo.url}
                                                        alt="Inspection photo"
                                                        style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                                                        onClick={() => window.open(photo.url, '_blank')}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="muted">No answers recorded</p>
                    )}
                </div>

                {/* Action Buttons (Bottom) */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 24, borderTop: '2px solid #e2e8f0' }}>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '12px 32px' }}
                        onClick={() => handleReview('APPROVED')}
                    >
                        ✓ Approve Inspection
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '12px 32px' }}
                        onClick={() => handleReview('REJECTED')}
                    >
                        ✗ Reject Inspection
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ padding: '12px 32px' }}
                        onClick={() => handleReview('ACTION_REQUIRED')}
                    >
                        ⚠️ Request Action
                    </button>
                </div>
            </div>
        </div>
    );
}
