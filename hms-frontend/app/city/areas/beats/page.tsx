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

            // Reset after successful upload
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
        </div>
    );
}
