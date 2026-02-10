'use client';

import { useState, useEffect, useRef, ComponentType } from "react";
import { ApiError, GeoApi, apiFetch } from "@lib/apiClient";
import { getTokenFromCookies } from "@lib/auth";
import dynamic from 'next/dynamic';

type KMLFeature = {
    name: string;
    properties: Record<string, any>;
    geometry: {
        type: string;
        coordinates: number[][] | number[][][];
    };
};

// Dynamically import Map component to avoid SSR issues
const MapViewer = dynamic(() => import('./MapViewer.tsx' as any).then(mod => ({ default: mod.default })), {
    ssr: false
}) as ComponentType<{ features: KMLFeature[] }>;

type GeoNode = { id: string; name: string; parentId?: string | null; level: string };

export default function BeatUploadPage() {
    const [zones, setZones] = useState<GeoNode[]>([]);
    const [wards, setWards] = useState<GeoNode[]>([]);
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [kmlFile, setKmlFile] = useState<File | null>(null);

    const [parsedFeatures, setParsedFeatures] = useState<KMLFeature[]>([]);
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [existingBeats, setExistingBeats] = useState<any[]>([]);
    const [loadingBeats, setLoadingBeats] = useState(false);

    // CRUD modal states
    const [editingBeat, setEditingBeat] = useState<any | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [beatToDelete, setBeatToDelete] = useState<any | null>(null);
    const [viewingBeat, setViewingBeat] = useState<any | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Load zones and wards
    useEffect(() => {
        const loadGeo = async () => {
            try {
                setLoading(true);
                const [zonesRes, wardsRes] = await Promise.all([
                    GeoApi.list("ZONE"),
                    GeoApi.list("WARD")
                ]);
                setZones((zonesRes as any).nodes ?? []);
                setWards((wardsRes as any).nodes ?? []);
            } catch (err) {
                console.error("Failed to load zones/wards", err);
            } finally {
                setLoading(false);
            }
        };
        loadGeo();
    }, []);

    // Load existing beats
    const loadBeats = async () => {
        try {
            setLoadingBeats(true);
            const token = getTokenFromCookies();
            if (!token) throw new Error("Auth token missing");

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/modules/sweeping/admin/beats`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) throw new Error("Failed to load beats");

            const data = await res.json();
            setExistingBeats(data.beats || []);
        } catch (err) {
            console.error("Failed to load beats:", err);
        } finally {
            setLoadingBeats(false);
        }
    };

    useEffect(() => {
        loadBeats();
    }, []);

    // Handle edit beat
    const handleEditBeat = async (beatData: any) => {
        try {
            const token = getTokenFromCookies();
            if (!token) throw new Error("Auth token missing");

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/modules/sweeping/admin/beats/${editingBeat.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(beatData)
                }
            );

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to update beat");
            }

            setUploadStatus("✅ Beat updated successfully!");
            setShowEditModal(false);
            setEditingBeat(null);
            await loadBeats();

            setTimeout(() => setUploadStatus(""), 3000);
        } catch (err: any) {
            console.error(err);
            setUploadStatus(`❌ ${err.message || "Update failed"}`);
        }
    };

    // Handle delete beat
    const handleDeleteBeat = async () => {
        if (!beatToDelete) return;

        try {
            const token = getTokenFromCookies();
            if (!token) throw new Error("Auth token missing");

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/modules/sweeping/admin/beats/${beatToDelete.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to delete beat");
            }

            setUploadStatus("✅ Beat deleted successfully!");
            setShowDeleteModal(false);
            setBeatToDelete(null);
            await loadBeats();

            setTimeout(() => setUploadStatus(""), 3000);
        } catch (err: any) {
            console.error(err);
            setUploadStatus(`❌ ${err.message || "Delete failed"}`);
            setShowDeleteModal(false);
        }
    };

    const wardsByZone = wards.filter(w => w.parentId === selectedZone);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setKmlFile(file);
        setParsedFeatures([]);
        setUploadStatus("");

        // Parse KML immediately for preview
        try {
            const kmlText = await file.text();
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlText, 'text/xml');

            const placemarks = kmlDoc.getElementsByTagName('Placemark');
            const features: KMLFeature[] = [];

            for (let i = 0; i < placemarks.length; i++) {
                const placemark = placemarks[i];
                const nameEl = placemark.getElementsByTagName('name')[0];
                const name = nameEl?.textContent || `Feature ${i + 1}`;

                // Extract properties from description if available
                const descEl = placemark.getElementsByTagName('description')[0];
                const properties: Record<string, any> = { description: descEl?.textContent || '' };

                // Extract coordinates
                const polygonEl = placemark.getElementsByTagName('Polygon')[0];
                const lineStringEl = placemark.getElementsByTagName('LineString')[0];
                const pointEl = placemark.getElementsByTagName('Point')[0];

                let geometry: any = null;

                if (polygonEl) {
                    const coordsText = polygonEl.getElementsByTagName('coordinates')[0]?.textContent || '';
                    const coords = parseCoordinates(coordsText);
                    geometry = { type: 'Polygon', coordinates: [coords] };
                } else if (lineStringEl) {
                    const coordsText = lineStringEl.getElementsByTagName('coordinates')[0]?.textContent || '';
                    const coords = parseCoordinates(coordsText);
                    geometry = { type: 'LineString', coordinates: coords };
                } else if (pointEl) {
                    const coordsText = pointEl.getElementsByTagName('coordinates')[0]?.textContent || '';
                    const coords = parseCoordinates(coordsText);
                    geometry = { type: 'Point', coordinates: coords[0] || [0, 0] };
                }

                if (geometry) {
                    features.push({ name, properties, geometry });
                }
            }

            setParsedFeatures(features);
            setUploadStatus(`Loaded ${features.length} features from KML`);
        } catch (err) {
            console.error("KML parse error:", err);
            setUploadStatus("Failed to parse KML file");
        }
    };

    const parseCoordinates = (coordsText: string): number[][] => {
        return coordsText
            .trim()
            .split(/\s+/)
            .map(coord => {
                const [lng, lat, alt] = coord.split(',').map(Number);
                return [lng, lat];
            })
            .filter(coord => !isNaN(coord[0]) && !isNaN(coord[1]));
    };

    const handleUpload = async () => {
        if (!kmlFile || !selectedWard) {
            setUploadStatus("Please select a ward and upload a KML file");
            return;
        }

        setUploading(true);
        setUploadStatus("Uploading...");

        try {
            const form = new FormData();
            form.append("file", kmlFile);
            form.append("wardId", selectedWard);

            const token = getTokenFromCookies();
            if (!token) throw new Error("Auth token missing");

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"}/modules/sweeping/admin/upload-kml`,
                {
                    method: "POST",
                    body: form,
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }

            const data = await res.json();
            setUploadStatus(`✅ Successfully created ${data.createdBeats} beats!`);

            // Reload beats list to show newly created beats
            await loadBeats();

            // Reset form after successful upload
            setTimeout(() => {
                setKmlFile(null);
                setParsedFeatures([]);
                setSelectedZone("");
                setSelectedWard("");
                setUploadStatus("");
            }, 3000);
        } catch (err: any) {
            console.error(err);
            setUploadStatus(`❌ ${err.message || "Upload failed"}`);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="card">
                    <div className="skeleton" style={{ height: 40 }} />
                </div>
            </div>
        );
    }

    return (
        <div className="page" style={{
            backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            minHeight: '100vh',
            padding: '16px 24px'
        }}>
            {/* Header Card */}
            <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, marginBottom: 24, overflow: 'hidden' }}>
                <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <div className="breadcrumb" style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>City Admin</span>
                        <span>/</span>
                        <span>Areas</span>
                        <span>/</span>
                        <span>Beat KML Upload</span>
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Upload & Preview Beat KML</h2>
                    <p className="muted" style={{ margin: '8px 0 0 0', fontSize: 14, color: '#64748b' }}>
                        Upload a KML file to visualize and create beats mapped to roads
                    </p>
                </div>
            </div>

            {/* Upload Controls */}
            <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 32, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>📁 Select Zone, Ward & KML File</h3>

                <div className="form" style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>Zone</label>
                        <select
                            className="input"
                            value={selectedZone}
                            onChange={(e) => {
                                setSelectedZone(e.target.value);
                                setSelectedWard("");
                            }}
                            style={{ width: '100%' }}
                        >
                            <option value="">Select Zone</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>Ward</label>
                        <select
                            className="input"
                            value={selectedWard}
                            onChange={(e) => setSelectedWard(e.target.value)}
                            disabled={!selectedZone || wardsByZone.length === 0}
                            style={{ width: '100%' }}
                        >
                            <option value="">Select Ward</option>
                            {wardsByZone.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>KML File</label>
                        <input
                            type="file"
                            accept=".kml"
                            onChange={handleFileSelect}
                            style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: 8 }}
                        />
                    </div>

                    {uploadStatus && (
                        <div style={{
                            padding: 12,
                            background: uploadStatus.includes('✅') ? '#dcfce7' : uploadStatus.includes('❌') ? '#fee2e2' : '#eff6ff',
                            color: uploadStatus.includes('✅') ? '#166534' : uploadStatus.includes('❌') ? '#991b1b' : '#1e40af',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600
                        }}>
                            {uploadStatus}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={!kmlFile || !selectedWard || uploading}
                        style={{ width: 'fit-content', marginTop: 8 }}
                    >
                        {uploading ? "Uploading..." : "🚀 Upload & Create Beats"}
                    </button>
                </div>
            </div>

            {/* Map Preview */}
            {parsedFeatures.length > 0 && (
                <>
                    <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, marginBottom: 24, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 32px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                🗺️ Map Preview ({parsedFeatures.length} Features)
                            </h3>
                        </div>
                        <div style={{ height: 600, width: '100%' }}>
                            <MapViewer features={parsedFeatures} />
                        </div>
                    </div>

                    {/* Feature List */}
                    <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 32px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                📋 KML Features Data
                            </h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                                        <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Type</th>
                                        <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Coordinates Count</th>
                                        <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Properties</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedFeatures.map((feature, idx) => {
                                        const coordCount = feature.geometry.type === 'Polygon'
                                            ? (feature.geometry.coordinates[0] as number[][]).length
                                            : feature.geometry.type === 'LineString'
                                                ? (feature.geometry.coordinates as number[][]).length
                                                : 1;

                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                                <td style={{ padding: '16px 32px', fontWeight: 600, color: '#0f172a' }}>{feature.name}</td>
                                                <td style={{ padding: '16px 32px' }}>
                                                    <span style={{
                                                        background: feature.geometry.type === 'Polygon' ? '#dbeafe' : feature.geometry.type === 'LineString' ? '#fef3c7' : '#fce7f3',
                                                        color: feature.geometry.type === 'Polygon' ? '#1e40af' : feature.geometry.type === 'LineString' ? '#92400e' : '#9f1239',
                                                        padding: '4px 12px',
                                                        borderRadius: 99,
                                                        fontSize: 12,
                                                        fontWeight: 700
                                                    }}>
                                                        {feature.geometry.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 32px', color: '#64748b' }}>{coordCount} points</td>
                                                <td style={{ padding: '16px 32px', color: '#64748b', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {Object.keys(feature.properties).length} properties
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Existing Beats List */}
            <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, overflow: 'hidden', marginTop: 24 }}>
                <div style={{ padding: '20px 32px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            📍 Created Beats
                        </h3>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                            {existingBeats.length} total beats in the system
                        </p>
                    </div>
                    <button
                        className="btn"
                        onClick={loadBeats}
                        disabled={loadingBeats}
                        style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                        {loadingBeats ? "⏳ Loading..." : "🔄 Refresh"}
                    </button>
                </div>

                {loadingBeats ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                        <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
                    </div>
                ) : existingBeats.length === 0 ? (
                    <div style={{ padding: 64, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                        <h4 style={{ fontSize: 16, fontWeight: 600, color: '#334155', marginBottom: 8 }}>No beats created yet</h4>
                        <p style={{ fontSize: 14, color: '#94a3b8' }}>Upload a KML file to create your first beat</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Beat Name</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Ward</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Area Type</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Location</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assigned To</th>
                                    <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Created</th>
                                    <th style={{ textAlign: 'right', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {existingBeats.map((beat, idx) => (
                                    <tr key={beat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 32px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '16px 32px', fontWeight: 600, color: '#0f172a' }}>
                                            {beat.geoNodeBeat?.name || 'Unnamed Beat'}
                                        </td>
                                        <td style={{ padding: '16px 32px', color: '#64748b' }}>
                                            {beat.geoNodeBeat?.parent?.name || 'N/A'}
                                        </td>
                                        <td style={{ padding: '16px 32px' }}>
                                            <span style={{
                                                background: beat.areaType === 'RESIDENTIAL' ? '#dbeafe' : beat.areaType === 'COMMERCIAL' ? '#fef3c7' : '#fce7f3',
                                                color: beat.areaType === 'RESIDENTIAL' ? '#1e40af' : beat.areaType === 'COMMERCIAL' ? '#92400e' : '#9f1239',
                                                padding: '4px 12px',
                                                borderRadius: 99,
                                                fontSize: 12,
                                                fontWeight: 700
                                            }}>
                                                {beat.areaType}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 32px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                                            {beat.latitude?.toFixed(6)}, {beat.longitude?.toFixed(6)}
                                        </td>
                                        <td style={{ padding: '16px 32px' }}>
                                            {beat.assignmentStatus ? (
                                                <span style={{
                                                    background: beat.assignmentStatus === 'ACTIVE' ? '#dcfce7' : '#f3f4f6',
                                                    color: beat.assignmentStatus === 'ACTIVE' ? '#166534' : '#6b7280',
                                                    padding: '4px 12px',
                                                    borderRadius: 99,
                                                    fontSize: 12,
                                                    fontWeight: 700
                                                }}>
                                                    {beat.assignmentStatus}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: 12 }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px 32px', color: '#64748b' }}>
                                            {beat.assignedEmployee?.name || '—'}
                                        </td>
                                        <td style={{ padding: '16px 32px', color: '#64748b', fontSize: 12 }}>
                                            {new Date(beat.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ padding: '16px 32px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setViewingBeat(beat);
                                                        setShowViewModal(true);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: '#eff6ff',
                                                        color: '#1e40af',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: 6,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="View on map"
                                                >
                                                    👁️ View
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingBeat(beat);
                                                        setShowEditModal(true);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        border: '1px solid #fde68a',
                                                        borderRadius: 6,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Edit beat"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setBeatToDelete(beat);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    disabled={beat.assignmentStatus === 'ACTIVE'}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: beat.assignmentStatus === 'ACTIVE' ? '#f3f4f6' : '#fee2e2',
                                                        color: beat.assignmentStatus === 'ACTIVE' ? '#9ca3af' : '#991b1b',
                                                        border: `1px solid ${beat.assignmentStatus === 'ACTIVE' ? '#e5e7eb' : '#fecaca'}`,
                                                        borderRadius: 6,
                                                        cursor: beat.assignmentStatus === 'ACTIVE' ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={beat.assignmentStatus === 'ACTIVE' ? 'Cannot delete active beat' : 'Delete beat'}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && editingBeat && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 32,
                        maxWidth: 500,
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                            ✏️ Edit Beat
                        </h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleEditBeat({
                                name: formData.get('name') as string,
                                areaType: formData.get('areaType') as string,
                                latitude: parseFloat(formData.get('latitude') as string),
                                longitude: parseFloat(formData.get('longitude') as string),
                                radiusMeters: parseFloat(formData.get('radiusMeters') as string)
                            });
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                        Beat Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        defaultValue={editingBeat.geoNodeBeat?.name}
                                        className="input"
                                        style={{ width: '100%' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                        Area Type
                                    </label>
                                    <select name="areaType" defaultValue={editingBeat.areaType} className="input" style={{ width: '100%' }} required>
                                        <option value="RESIDENTIAL">Residential</option>
                                        <option value="COMMERCIAL">Commercial</option>
                                        <option value="SLUM">Slum</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                        Latitude
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="latitude"
                                        defaultValue={editingBeat.latitude}
                                        className="input"
                                        style={{ width: '100%' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                        Longitude
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="longitude"
                                        defaultValue={editingBeat.longitude}
                                        className="input"
                                        style={{ width: '100%' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#334155' }}>
                                        Radius (meters)
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="radiusMeters"
                                        defaultValue={editingBeat.radiusMeters}
                                        className="input"
                                        style={{ width: '100%' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        💾 Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingBeat(null);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        ❌ Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && beatToDelete && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 32,
                        maxWidth: 400,
                        width: '90%'
                    }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#991b1b', marginBottom: 16 }}>
                            🗑️ Delete Beat
                        </h3>
                        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                            Are you sure you want to delete beat <strong>{beatToDelete.geoNodeBeat?.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={handleDeleteBeat}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    background: '#dc2626',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                Yes, Delete
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setBeatToDelete(null);
                                }}
                                className="btn"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal with Map */}
            {showViewModal && viewingBeat && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 32,
                        maxWidth: 800,
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                            👁️ View Beat: {viewingBeat.geoNodeBeat?.name}
                        </h3>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Ward</label>
                                    <p style={{ fontSize: 14, color: '#0f172a', margin: '4px 0 0 0' }}>{viewingBeat.geoNodeBeat?.parent?.name}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Area Type</label>
                                    <p style={{ fontSize: 14, color: '#0f172a', margin: '4px 0 0 0' }}>{viewingBeat.areaType}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Location</label>
                                    <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#0f172a', margin: '4px 0 0 0' }}>
                                        {viewingBeat.latitude?.toFixed(6)}, {viewingBeat.longitude?.toFixed(6)}
                                    </p>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Status</label>
                                    <p style={{ fontSize: 14, color: '#0f172a', margin: '4px 0 0 0' }}>
                                        {viewingBeat.assignmentStatus || 'Unassigned'}
                                    </p>
                                </div>
                            </div>
                            {viewingBeat.geometry && (
                                <div style={{ height: 400, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                                    <MapViewer features={[{
                                        name: viewingBeat.geoNodeBeat?.name || 'Beat',
                                        properties: {},
                                        geometry: viewingBeat.geometry
                                    }]} />
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setShowViewModal(false);
                                setViewingBeat(null);
                            }}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
