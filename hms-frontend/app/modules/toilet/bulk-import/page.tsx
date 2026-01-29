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
        // Validate required fields
        if (!formData.name || !formData.wardId || !formData.latitude || !formData.longitude) {
            setError('Please fill all required fields (Name, Ward ID, Latitude, Longitude)');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            // Convert to CSV format for backend
            const csvData = `Name,Ward ID,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n${formData.name},${formData.wardId},${formData.type},${formData.gender},${formData.code},${formData.operatorName},${formData.numberOfSeats},${formData.latitude},${formData.longitude},${formData.address}`;

            const response = await ToiletApi.bulkImport(csvData);
            setResult(response);

            // Reset form
            setFormData({
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

            setTimeout(() => router.push('/modules/toilet'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save toilet');
        } finally {
            setSubmitting(false);
        }
    };

    const downloadTemplate = () => {
        const template = 'Name,Ward ID,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address\n' +
            'CT-Ward-5-Main,<your-ward-uuid>,CT,MALE,CT-001,ULB,5,28.6139,77.2090,Near Main Market\n' +
            'PT-Station-Road,<your-ward-uuid>,PT,UNISEX,PT-002,Private,3,28.6140,77.2091,Station Road';

        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toilet-import-template.csv';
        a.click();
    };

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto', padding: 40 }}>
            <div className="card">
                <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 900 }}>📥 Toilet Import</h2>
                <p className="muted" style={{ marginBottom: 24, fontSize: 14 }}>
                    Add toilets manually or import multiple toilets from a CSV file
                </p>

                {/* Tab Switcher */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #e2e8f0' }}>
                    <button
                        onClick={() => setActiveTab('MANUAL')}
                        style={{
                            padding: '12px 24px',
                            fontSize: 14,
                            fontWeight: 700,
                            background: activeTab === 'MANUAL' ? '#1d4ed8' : 'transparent',
                            color: activeTab === 'MANUAL' ? '#fff' : '#64748b',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✏️ Manual Entry
                    </button>
                    <button
                        onClick={() => setActiveTab('CSV')}
                        style={{
                            padding: '12px 24px',
                            fontSize: 14,
                            fontWeight: 700,
                            background: activeTab === 'CSV' ? '#1d4ed8' : 'transparent',
                            color: activeTab === 'CSV' ? '#fff' : '#64748b',
                            border: 'none',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        📊 CSV Bulk Upload
                    </button>
                </div>

                {/* Manual Entry Tab */}
                {activeTab === 'MANUAL' && (
                    <div>
                        <div style={{ backgroundColor: '#dbeafe', padding: 12, borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #3b82f6' }}>
                            <p style={{ fontSize: 13, color: '#1e40af', margin: 0 }}>
                                <strong>Manual Entry:</strong> Fill in the form below to add a single toilet. All imported toilets will be automatically approved.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            {/* Name */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Toilet Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="e.g., CT-Ward-5-Main"
                                />
                            </div>

                            {/* Ward ID */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Ward ID (UUID) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.wardId}
                                    onChange={(e) => setFormData({ ...formData, wardId: e.target.value })}
                                    className="input"
                                    placeholder="Get from Wards list"
                                />
                            </div>

                            {/* Code */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="input"
                                    placeholder="e.g., CT-001"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Type <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input"
                                >
                                    <option value="CT">CT (Community Toilet)</option>
                                    <option value="PT">PT (Public Toilet)</option>
                                </select>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Gender <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="input"
                                >
                                    <option value="MALE">MALE</option>
                                    <option value="FEMALE">FEMALE</option>
                                    <option value="ALL">ALL (UNISEX)</option>
                                </select>
                            </div>

                            {/* Latitude */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Latitude <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.latitude}
                                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 28.6139"
                                />
                            </div>

                            {/* Longitude */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Longitude <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.longitude}
                                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 77.2090"
                                />
                            </div>

                            {/* Operator Name */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Operator Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.operatorName}
                                    onChange={(e) => setFormData({ ...formData, operatorName: e.target.value })}
                                    className="input"
                                    placeholder="e.g., ULB, Private"
                                />
                            </div>

                            {/* Number of Seats */}
                            <div>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Number of Seats
                                </label>
                                <input
                                    type="number"
                                    value={formData.numberOfSeats}
                                    onChange={(e) => setFormData({ ...formData, numberOfSeats: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 5"
                                />
                            </div>

                            {/* Address */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>
                                    Address
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input"
                                    rows={2}
                                    placeholder="Full address"
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        {/* Error/Success Display */}
                        {error && (
                            <div className="alert error" style={{ marginBottom: 20 }}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {result && (
                            <div className="alert success" style={{ marginBottom: 20 }}>
                                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>✓ Toilet Saved Successfully!</h4>
                                <p style={{ marginBottom: 8 }}>
                                    <strong>{result.count}</strong> toilet(s) added to database.
                                </p>
                                <p style={{ fontSize: 13, opacity: 0.9 }}>
                                    Status: <strong>APPROVED</strong> (ready for assignment)
                                </p>
                                <p style={{ fontSize: 13, marginTop: 8 }}>Redirecting to toilet list...</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={handleManualSubmit}
                                disabled={submitting}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: 16, fontSize: 15, fontWeight: 700 }}
                            >
                                {submitting ? '⏳ Saving...' : '💾 Save Toilet'}
                            </button>

                            <button
                                onClick={() => router.back()}
                                className="btn btn-outline"
                                style={{ padding: 16, fontSize: 15, fontWeight: 700 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* CSV Upload Tab */}
                {activeTab === 'CSV' && (
                    <div>
                        <div style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
                            <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                                <strong>Bulk Upload:</strong> Import multiple toilets at once from a CSV file. All imported toilets will be automatically approved.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                            {/* Left: Instructions + Field Guide */}
                            <div>
                                {/* Instructions Section */}
                                <div style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20, borderLeft: '4px solid #3b82f6' }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: '#1e293b' }}>📋 How to Upload</h3>
                                    <ol style={{ marginLeft: 18, lineHeight: 1.7, color: '#475569', fontSize: 13 }}>
                                        <li><strong>Download</strong> the CSV template</li>
                                        <li><strong>Fill in</strong> your toilet data</li>
                                        <li><strong>Upload</strong> the file below</li>
                                        <li>All toilets will be <strong>auto-approved</strong></li>
                                    </ol>
                                </div>

                                {/* Field Guide */}
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📝 Field Guide</h3>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <FieldRow label="Name" required description="Toilet name (e.g., CT-Ward-5-Main)" />
                                        <FieldRow label="Ward ID" required description="UUID of the ward (get from Wards list)" />
                                        <FieldRow label="Type" required description="CT (Community Toilet) or PT (Public Toilet)" />
                                        <FieldRow label="Gender" required description="MALE, FEMALE, or ALL" />
                                        <FieldRow label="Latitude" required description="GPS latitude (decimal, e.g., 28.6139)" />
                                        <FieldRow label="Longitude" required description="GPS longitude (decimal, e.g., 77.2090)" />
                                        <FieldRow label="Code" description="Unique code (e.g., CT-001)" />
                                        <FieldRow label="Operator Name" description="Who operates it (e.g., ULB, Private)" />
                                        <FieldRow label="Number of Seats" description="Number of seats (integer)" />
                                        <FieldRow label="Address" description="Full address text" />
                                    </div>
                                </div>
                            </div>

                            {/* Right: CSV Format Example */}
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>📄 CSV Format Example</h3>
                                <div style={{ backgroundColor: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16, overflowX: 'auto' }}>
                                    <pre style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', margin: 0, lineHeight: 1.6 }}>
                                        {`Name,Ward ID,Type,Gender,Code,Operator Name,Number of Seats,Latitude,Longitude,Address
CT-Ward-5-Main,<ward-uuid>,CT,MALE,CT-001,ULB,5,28.6139,77.2090,Near Main Market
PT-Station-Road,<ward-uuid>,PT,ALL,PT-002,Private,3,28.6140,77.2091,Station Road`}
                                    </pre>
                                </div>

                                <button
                                    onClick={downloadTemplate}
                                    className="btn btn-outline"
                                    style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 700, marginBottom: 20 }}
                                >
                                    📥 Download CSV Template
                                </button>

                                {/* File Upload */}
                                <div>
                                    <label className="label" style={{ fontWeight: 700, marginBottom: 8 }}>Select CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="input"
                                        style={{ padding: 12 }}
                                    />
                                    {file && (
                                        <p style={{ marginTop: 8, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                                            ✓ File selected: {file.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Error/Success Display */}
                        {error && (
                            <div className="alert error" style={{ marginBottom: 20 }}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        {result && (
                            <div className="alert success" style={{ marginBottom: 20 }}>
                                <h4 style={{ fontWeight: 800, marginBottom: 8 }}>✓ Import Successful!</h4>
                                <p style={{ marginBottom: 8 }}>
                                    <strong>{result.count}</strong> toilets imported and saved to database.
                                </p>
                                <p style={{ fontSize: 13, opacity: 0.9 }}>
                                    Status: <strong>APPROVED</strong> (ready for assignment)
                                </p>
                                <p style={{ fontSize: 13, marginTop: 8 }}>Redirecting to toilet list...</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: 16, fontSize: 15, fontWeight: 700 }}
                            >
                                {uploading ? '⏳ Uploading...' : '📤 Upload & Import'}
                            </button>

                            <button
                                onClick={() => router.back()}
                                className="btn btn-outline"
                                style={{ padding: 16, fontSize: 15, fontWeight: 700 }}
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Post-Import Info */}
                        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#dbeafe', borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
                            <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: '#1e40af' }}>⚡ After Import</h4>
                            <ul style={{ marginLeft: 18, lineHeight: 1.7, color: '#1e3a8a', fontSize: 12 }}>
                                <li>All toilets will be <strong>APPROVED</strong> automatically</li>
                                <li>Go to <strong>Assignments</strong> tab to assign employees</li>
                                <li>Employees will see assigned toilets in their mobile app</li>
                                <li>Inspections can start immediately after assignment</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper component for field rows
function FieldRow({ label, required, description }: { label: string; required?: boolean; description: string }) {
    return (
        <div style={{ display: 'flex', gap: 10, padding: 10, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div style={{ minWidth: 100 }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{label}</span>
                {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
            </div>
            <div style={{ flex: 1, fontSize: 12, color: '#64748b' }}>{description}</div>
        </div>
    );
}
