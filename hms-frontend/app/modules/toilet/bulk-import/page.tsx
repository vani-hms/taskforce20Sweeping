'use client';

import { useState } from 'react';
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
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
            setError(err.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!formData.name || !formData.wardId || !formData.latitude || !formData.longitude) {
            setError('Please fill all required fields (Name, Ward ID, Latitude, Longitude)');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const csvData = `Name,Ward ID,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n${formData.name},${formData.wardId},${formData.type},${formData.gender},${formData.code},${formData.operatorName},${formData.numberOfSeats},${formData.latitude},${formData.longitude},${formData.address}`;
            const response = await ToiletApi.bulkImport(csvData);
            setResult(response);
            setFormData({
                name: '', wardId: '', type: 'CT', gender: 'MALE', code: '', operatorName: '', numberOfSeats: '', latitude: '', longitude: '', address: ''
            });
            setTimeout(() => router.push('/modules/toilet'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save toilet');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'Name,Zone Name,Ward Name,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n' +
            'CT-Ward-5-Main,Zone 1,Ward 5,CT,MALE,CT-001,ULB,5,28.6139,77.2090,Near Main Market\n' +
            'PT-Station-Road,Zone 2,Ward 10,PT,UNISEX,PT-002,Private,3,28.6140,77.2091,Station Road';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toilet-import-template.csv';
        a.click();
    };

    return (
        <div className="content page-centered">
            <div className="card" style={{ maxWidth: 1000, width: '100%' }}>
                <div className="card-header">
                    <div>
                        <h2 className="card-title">📥 Toilet Import</h2>
                        <p className="muted text-sm">Add toilets manually or import multiple from CSV</p>
                    </div>
                    <div className="tab-bar">
                        <button
                            onClick={() => setActiveTab('MANUAL')}
                            className={`tab ${activeTab === 'MANUAL' ? 'active' : ''}`}
                        >
                            ✏️ Manual Entry
                        </button>
                        <button
                            onClick={() => setActiveTab('CSV')}
                            className={`tab ${activeTab === 'CSV' ? 'active' : ''}`}
                        >
                            📊 CSV Bulk Upload
                        </button>
                    </div>
                </div>

                <div className="card-divider"></div>

                {activeTab === 'MANUAL' && (
                    <div className="form">
                        <div className="alert info mb-3">
                            <strong>Manual Entry:</strong> Fill in the form below. Imported toilets are auto-approved.
                        </div>

                        <div className="grid grid-2">
                            <InputField label="Toilet Name" required value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} placeholder="e.g., CT-Ward-5-Main" />
                            <InputField label="Ward ID" required value={formData.wardId} onChange={(v: string) => setFormData({ ...formData, wardId: v })} placeholder="UUID from Wards list" />

                            <SelectField label="Type" required value={formData.type} onChange={(v: string) => setFormData({ ...formData, type: v })}>
                                <option value="CT">CT (Community Toilet)</option>
                                <option value="PT">PT (Public Toilet)</option>
                            </SelectField>

                            <SelectField label="Gender" required value={formData.gender} onChange={(v: string) => setFormData({ ...formData, gender: v })}>
                                <option value="MALE">MALE</option>
                                <option value="FEMALE">FEMALE</option>
                                <option value="ALL">ALL (UNISEX)</option>
                                <option value="DISABLED">DISABLED</option>
                            </SelectField>

                            <InputField label="Code" value={formData.code} onChange={(v: string) => setFormData({ ...formData, code: v })} placeholder="e.g., CT-001" />
                            <InputField label="Operator Name" value={formData.operatorName} onChange={(v: string) => setFormData({ ...formData, operatorName: v })} placeholder="e.g., ULB, Private" />

                            <InputField label="Latitude" required value={formData.latitude} onChange={(v: string) => setFormData({ ...formData, latitude: v })} placeholder="e.g., 28.6139" />
                            <InputField label="Longitude" required value={formData.longitude} onChange={(v: string) => setFormData({ ...formData, longitude: v })} placeholder="e.g., 77.2090" />

                            <InputField label="Number of Seats" type="number" value={formData.numberOfSeats} onChange={(v: string) => setFormData({ ...formData, numberOfSeats: v })} placeholder="e.g., 5" />
                        </div>

                        <div className="form-field mt-2">
                            <label>Address</label>
                            <textarea
                                className="textarea"
                                rows={2}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address"
                            />
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={handleManualSubmit} disabled={submitting} className="btn btn-primary flex-1">
                                {submitting ? '⏳ Saving...' : '💾 Save Toilet'}
                            </button>
                            <button onClick={() => router.back()} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'CSV' && (
                    <div className="grid grid-2" style={{ alignItems: 'start' }}>
                        <div className="flex col gap-4">
                            <div className="alert info">
                                <h4 className="font-bold mb-2">📋 Instructions</h4>
                                <ol className="list text-sm pl-4" style={{ listStyle: 'decimal' }}>
                                    <li>Download the template.</li>
                                    <li>Fill in toilet data (Zone/Ward names are auto-created).</li>
                                    <li>Upload the CSV below.</li>
                                </ol>
                            </div>

                            <div className="card" style={{ border: '1px dashed var(--border-strong)', background: '#f8fafc' }}>
                                <div className="form-field">
                                    <label>Select CSV File</label>
                                    <input type="file" accept=".csv" onChange={handleFileChange} className="input" />
                                    {file && <p className="text-green-700 text-sm mt-2 font-bold">✓ {file.name}</p>}
                                </div>
                                <button onClick={handleUpload} disabled={!file || uploading} className="btn btn-primary w-full mt-4">
                                    {uploading ? '⏳ Uploading...' : '📤 Upload & Import'}
                                </button>
                                <button onClick={downloadTemplate} className="btn btn-secondary w-full mt-2">
                                    📥 Download Template
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold mb-3">📝 Field Guide</h3>
                            <div className="table-grid">
                                <div className="table-head" style={{ gridTemplateColumns: '1fr 2fr' }}>
                                    <span>Field</span>
                                    <span>Description</span>
                                </div>
                                <FieldRow label="Name *" desc="e.g. CT-Ward-5" />
                                <FieldRow label="Zone & Ward *" desc="Names (e.g. 'Zone 1', 'Ward 10')" />
                                <FieldRow label="Type *" desc="CT or PT" />
                                <FieldRow label="Gender *" desc="MALE, FEMALE, ALL" />
                                <FieldRow label="Lat/Lon *" desc="Decimal coordinates" />
                                <FieldRow label="Code" desc="Optional unique code" />
                            </div>
                        </div>
                    </div>
                )}

                {error && <div className="alert error mt-4"><strong>Error:</strong> {error}</div>}
                {result && (
                    <div className="alert success mt-4">
                        <h4 className="font-bold">✓ Success!</h4>
                        <p>{result.count} toilets imported. Redirecting...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function InputField({ label, value, onChange, placeholder, required, type = 'text' }: any) {
    return (
        <div className="form-field">
            <label>{label} {required && <span className="text-red-600">*</span>}</label>
            <input type={type} className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

function SelectField({ label, value, onChange, children, required }: any) {
    return (
        <div className="form-field">
            <label>{label} {required && <span className="text-red-600">*</span>}</label>
            <select className="select" value={value} onChange={e => onChange(e.target.value)}>
                {children}
            </select>
        </div>
    );
}

function FieldRow({ label, desc }: { label: string, desc: string }) {
    return (
        <div className="table-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <span className="font-bold text-sm">{label}</span>
            <span className="text-slate-600 text-sm">{desc}</span>
        </div>
    );
}
