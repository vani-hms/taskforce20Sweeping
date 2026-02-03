'use client';

import { useState, useEffect } from 'react';
import { ToiletApi } from '@lib/apiClient';
import { useRouter } from 'next/navigation';

type Tab = 'MANUAL' | 'CSV';

export default function BulkImportPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('MANUAL');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [wards, setWards] = useState<any[]>([]);

    // Manual form state
    const [formData, setFormData] = useState({
        name: '',
        wardId: '',
        type: 'CT',
        gender: 'MALE',
        code: '',
        operatorName: '',
        numberOfSeats: '',
        latitude: '',
        longitude: '',
        address: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadGeo = async () => {
            try {
                const zonesRes = await ToiletApi.getZones();
                const allWards: any[] = [];
                for (const zone of zonesRes.nodes) {
                    const wardsRes = await ToiletApi.getWardsByZone(zone.id);
                    allWards.push(...wardsRes.nodes.map((w: any) => ({ ...w, zoneName: zone.name })));
                }
                setWards(allWards);
            } catch (err) {
                console.error("Failed to load geo nodes", err);
            }
        };
        loadGeo();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please selection a CSV file context');
            return;
        }
        setUploading(true);
        setError('');
        try {
            const text = await file.text();
            const response = await ToiletApi.bulkImport(text);
            setResult(response);
            setTimeout(() => router.push('/modules/toilet'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to process infrastructure data');
        } finally {
            setUploading(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!formData.name || !formData.wardId || !formData.latitude || !formData.longitude) {
            setError('Mandatory fields: Asset Name, Ward, and Coordinates.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const csvData = `Name,Ward ID,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n${formData.name},${formData.wardId},${formData.type},${formData.gender},${formData.code},${formData.operatorName},${formData.numberOfSeats},${formData.latitude},${formData.longitude},${formData.address}`;
            const response = await ToiletApi.bulkImport(csvData);
            setResult(response);
            setTimeout(() => router.push('/modules/toilet'), 3000);
        } catch (err: any) {
            setError(err.message || 'Registry sync failed');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'Name,Zone Name,Ward Name,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n' +
            'CT-Ward-5-Main,Central Zone,Ward 5,CT,MALE,CT-001,ULB,5,28.6139,77.2090,Near Main Market\n' +
            'PT-Station-Road,West Zone,Ward 10,PT,UNISEX,PT-002,Private,3,28.6140,77.2091,Station Road';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'infrastructure-import-template.csv';
        a.click();
    };

    return (
        <div style={{ padding: '0 0 40px 0', animation: 'fadeIn 0.5s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .glass-card {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid #edf2f7;
                    border-radius: 32px;
                    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.05);
                    overflow: hidden;
                }
                .input-field {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #1e293b;
                    transition: all 0.2s;
                    width: 100%;
                    outline: none;
                }
                .input-field:focus {
                    border-color: #1e293b;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(30, 41, 59, 0.05);
                }
                .label {
                    font-size: 11px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    display: block;
                }
                .tab-btn {
                    padding: 12px 24px;
                    font-size: 13px;
                    font-weight: 800;
                    border-radius: 12px;
                    transition: all 0.2s;
                    cursor: pointer;
                    border: none;
                }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', margin: 0 }}>Asset Onboarding</h1>
                    <p style={{ color: '#64748b', fontSize: 15, marginTop: 4, fontWeight: 500 }}>Expand infrastructure registry via manual entry or cryptographic CSV datasets.</p>
                </div>
                <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 16 }}>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab('MANUAL')}
                        style={{ backgroundColor: activeTab === 'MANUAL' ? '#ffffff' : 'transparent', color: activeTab === 'MANUAL' ? '#0f172a' : '#64748b', boxShadow: activeTab === 'MANUAL' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                    >Manual</button>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab('CSV')}
                        style={{ backgroundColor: activeTab === 'CSV' ? '#ffffff' : 'transparent', color: activeTab === 'CSV' ? '#0f172a' : '#64748b', boxShadow: activeTab === 'CSV' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}
                    >Bulk (CSV)</button>
                </div>
            </div>

            <div className="glass-card">
                {activeTab === 'MANUAL' ? (
                    <div style={{ padding: 40 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                            <div>
                                <label className="label">Asset Identifier</label>
                                <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. South Park Toilet Complex" />
                            </div>
                            <div>
                                <label className="label">Operational Ward</label>
                                <select className="input-field" value={formData.wardId} onChange={e => setFormData({ ...formData, wardId: e.target.value })}>
                                    <option value="">Select Ward</option>
                                    {wards.map(w => (
                                        <option key={w.id} value={w.id}>{w.zoneName} / {w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Infrastructure Type</label>
                                <select className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="CT">Community Toilet (CT)</option>
                                    <option value="PT">Public Toilet (PT)</option>
                                    <option value="ODF">ODF Plus Facility</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Access Scope</label>
                                <select className="input-field" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="MALE">Male Only</option>
                                    <option value="FEMALE">Female Only</option>
                                    <option value="ALL">Unisex / All Genders</option>
                                    <option value="DISABLED">Divyang Accessible</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">Registry Code</label>
                                <input className="input-field" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="UNIQUE-TAG-001" />
                            </div>
                            <div>
                                <label className="label">Operator Entity</label>
                                <input className="input-field" value={formData.operatorName} onChange={e => setFormData({ ...formData, operatorName: e.target.value })} placeholder="e.g. ULB or Private Org" />
                            </div>
                            <div>
                                <label className="label">Latitude</label>
                                <input className="input-field" value={formData.latitude} onChange={e => setFormData({ ...formData, latitude: e.target.value })} placeholder="Coordinates Decimal" />
                            </div>
                            <div>
                                <label className="label">Longitude</label>
                                <input className="input-field" value={formData.longitude} onChange={e => setFormData({ ...formData, longitude: e.target.value })} placeholder="Coordinates Decimal" />
                            </div>
                            <div>
                                <label className="label">Capacity (Seats)</label>
                                <input className="input-field" type="number" value={formData.numberOfSeats} onChange={e => setFormData({ ...formData, numberOfSeats: e.target.value })} placeholder="Number of stalls" />
                            </div>
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <label className="label">Site Address</label>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 100, resize: 'none' }}
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Detailed positioning details..."
                            />
                        </div>

                        <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                            <button
                                onClick={handleManualSubmit}
                                disabled={submitting}
                                style={{ flex: 1, backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px -5px rgba(15,23,42,0.3)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {submitting ? 'Syncing...' : 'Complete Registry Entry'}
                            </button>
                            <button
                                onClick={() => router.back()}
                                style={{ padding: '16px 32px', border: '1px solid #e2e8f0', borderRadius: 16, background: 'transparent', color: '#64748b', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
                            >Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: 40, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'start' }}>
                        <div>
                            <div style={{ backgroundColor: '#f8fafc', borderRadius: 24, padding: 32, border: '2px dashed #e2e8f0', textAlign: 'center', transition: 'all 0.3s' }} onDragOver={e => e.preventDefault()} onMouseEnter={e => e.currentTarget.style.borderColor = '#1e293b'}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Global Asset Protocol</h3>
                                <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Drop your CSV infrastructure dataset here to sync with the central database.</p>

                                <label style={{ display: 'inline-block', marginTop: 24, backgroundColor: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                                    Select CSV File
                                    <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                                </label>

                                {file && (
                                    <div style={{ marginTop: 20, padding: '12px', backgroundColor: '#ecfdf5', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                        <span style={{ color: '#059669', fontWeight: 900 }}>📦</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>{file.name} (Ready)</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    style={{ flex: 1, backgroundColor: file ? '#0f172a' : '#94a3b8', color: 'white', border: 'none', borderRadius: 16, padding: '16px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s' }}
                                >{uploading ? 'Processing Data...' : 'Initiate Import'}</button>
                                <button
                                    onClick={downloadTemplate}
                                    style={{ padding: '16px 24px', border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', color: '#1e293b', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                                >Template</button>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 900, color: '#1e293b' }}>Protocol Guard</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { f: 'Asset Name', d: 'Unique identifier for the site' },
                                    { f: 'Zone/Ward Names', d: 'Natural language names for auto-mapping' },
                                    { f: 'Infr. Type', d: 'CT, PT, or ODF+ Facility' },
                                    { f: 'Coordinates', d: 'Latitude & Longitude in decimal' },
                                    { f: 'Capacity', d: 'Total operational stall count' }
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '16px', backgroundColor: '#fcfdfe', borderRadius: 16, border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{item.f}</span>
                                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{item.d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {error && <div style={{ marginTop: 24, padding: '16px 24px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 20, color: '#991b1b', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span> {error}
            </div>}

            {result && <div style={{ marginTop: 24, padding: '24px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 24, color: '#065f46', textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                <h3 style={{ margin: 0, fontWeight: 900 }}>Synchronized Successfully</h3>
                <p style={{ margin: '8px 0 0 0', fontWeight: 500 }}>{result.count} new infrastructure nodes added to registry. Redirecting to workspace...</p>
            </div>}
        </div>
    );
}
