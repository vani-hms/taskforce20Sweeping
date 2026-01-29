'use client';

import { useEffect, useState } from "react";
import { ToiletApi } from "@lib/apiClient";

export default function AllToiletsTab() {
    const [toilets, setToilets] = useState<any[]>([]);
    const [filteredToilets, setFilteredToilets] = useState<any[]>([]);
    const [selectedToilet, setSelectedToilet] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CT' | 'PT'>('ALL');
    const [genderFilter, setGenderFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [zoneFilter, setZoneFilter] = useState('ALL');
    const [wardFilter, setWardFilter] = useState('ALL');
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    useEffect(() => {
        loadToilets();
        loadZones();
    }, []);

    useEffect(() => {
        if (zoneFilter === 'ALL') {
            setWards([]);
            setWardFilter('ALL');
            return;
        }
        loadWards(zoneFilter);
    }, [zoneFilter]);

    // Apply filters whenever search/filter changes
    useEffect(() => {
        applyFilters();
    }, [searchQuery, typeFilter, genderFilter, statusFilter, zoneFilter, wardFilter, toilets]);

    const loadToilets = async () => {
        try {
            const res = await ToiletApi.listToilets();
            setToilets(res.toilets || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadZones = async () => {
        try {
            const res = await ToiletApi.getZones();
            setZones(res.zones || []);
        } catch (err) { console.error(err); }
    };

    const loadWards = async (zoneId: string) => {
        try {
            const res = await ToiletApi.getWardsByZone(zoneId);
            setWards(res.wards || []);
        } catch (err) { console.error(err); }
    };

    const applyFilters = () => {
        let filtered = [...toilets];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.name?.toLowerCase().includes(query) ||
                t.code?.toLowerCase().includes(query) ||
                t.ward?.name?.toLowerCase().includes(query)
            );
        }

        // Type filter
        if (typeFilter !== 'ALL') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }

        // Gender filter
        if (genderFilter !== 'ALL') {
            filtered = filtered.filter(t => t.gender === genderFilter);
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(t => t.status === statusFilter);
        }

        // Zone filter (Implicitly filters by Ward if a Ward is selected later)
        if (zoneFilter !== 'ALL' && wardFilter === 'ALL') {
            filtered = filtered.filter(t => t.ward?.parentId === zoneFilter || t.ward?.id === zoneFilter);
        }

        // Ward filter
        if (wardFilter !== 'ALL') {
            filtered = filtered.filter(t => t.wardId === wardFilter || t.ward?.parentId === wardFilter);
        }

        setFilteredToilets(filtered);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('ALL');
        setGenderFilter('ALL');
        setStatusFilter('ALL');
        setWardFilter('ALL');
    };

    const viewDetails = async (id: string) => {
        try {
            const res = await ToiletApi.getToiletDetails(id);
            setSelectedToilet(res.toilet);
        } catch (err) {
            alert("Failed to load toilet details");
        }
    };

    if (selectedToilet) {
        return (
            <div>
                <button onClick={() => setSelectedToilet(null)} style={{ marginBottom: 16, padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    ← Back to List
                </button>
                <div className="card">
                    <h2 style={{ marginBottom: 24 }}>{selectedToilet.name}</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#64748b' }}>BASIC INFO</h3>
                            <p><strong>Type:</strong> {selectedToilet.type}</p>
                            <p><strong>Gender:</strong> {selectedToilet.gender}</p>
                            <p><strong>Seats:</strong> {selectedToilet.numberOfSeats || 0}</p>
                            <p><strong>Code:</strong> {selectedToilet.code || 'N/A'}</p>
                            <p><strong>Status:</strong> <span style={{ color: selectedToilet.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>{selectedToilet.status}</span></p>
                        </div>

                        <div>
                            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#64748b' }}>LOCATION</h3>
                            <p><strong>Ward:</strong> {selectedToilet.ward?.name}</p>
                            <p><strong>Zone:</strong> {selectedToilet.ward?.parent?.name || 'N/A'}</p>
                            <p><strong>Address:</strong> {selectedToilet.address || 'N/A'}</p>
                            <p><strong>Coordinates:</strong> {selectedToilet.latitude.toFixed(6)}, {selectedToilet.longitude.toFixed(6)}</p>
                        </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#64748b' }}>FACILITIES</h3>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <span style={{ padding: '4px 12px', background: selectedToilet.hasWater ? '#d1fae5' : '#fee2e2', color: selectedToilet.hasWater ? '#065f46' : '#991b1b', borderRadius: 12, fontSize: 12 }}>
                                {selectedToilet.hasWater ? '✓' : '✗'} Water
                            </span>
                            <span style={{ padding: '4px 12px', background: selectedToilet.hasElectricity ? '#d1fae5' : '#fee2e2', color: selectedToilet.hasElectricity ? '#065f46' : '#991b1b', borderRadius: 12, fontSize: 12 }}>
                                {selectedToilet.hasElectricity ? '✓' : '✗'} Electricity
                            </span>
                            <span style={{ padding: '4px 12px', background: selectedToilet.hasHandwash ? '#d1fae5' : '#fee2e2', color: selectedToilet.hasHandwash ? '#065f46' : '#991b1b', borderRadius: 12, fontSize: 12 }}>
                                {selectedToilet.hasHandwash ? '✓' : '✗'} Handwash
                            </span>
                        </div>
                    </div>

                    {selectedToilet.assignments && selectedToilet.assignments.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#64748b' }}>ASSIGNED EMPLOYEES</h3>
                            {selectedToilet.assignments.map((a: any) => (
                                <div key={a.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                                    <p><strong>{a.employee.name}</strong></p>
                                    <p style={{ fontSize: 12, color: '#64748b' }}>{a.employee.email}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedToilet.inspections && selectedToilet.inspections.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h3 style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: '#64748b' }}>RECENT INSPECTIONS</h3>
                            {selectedToilet.inspections.map((i: any) => (
                                <div key={i.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                                    <p><strong>{i.employee.name}</strong> - <span style={{ color: i.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>{i.status}</span></p>
                                    <p style={{ fontSize: 12, color: '#64748b' }}>{new Date(i.createdAt).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (loading) return <div>Loading toilets...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0 }}>All Registered Toilets ({filteredToilets.length})</h2>
                <a
                    href="/modules/toilet/bulk-import"
                    className="btn btn-primary"
                    style={{ fontSize: 14, padding: '10px 20px', textDecoration: 'none' }}
                >
                    📥 Bulk Import Toilets
                </a>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="🔍 Search by name, code, or ward..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input"
                    style={{ width: '100%', padding: 12, fontSize: 14 }}
                />
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className={`btn ${typeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTypeFilter('ALL')}
                        style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                        All
                    </button>
                    <button
                        className={`btn ${typeFilter === 'CT' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTypeFilter('CT')}
                        style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                        CT
                    </button>
                    <button
                        className={`btn ${typeFilter === 'PT' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTypeFilter('PT')}
                        style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                        PT
                    </button>
                </div>

                <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                >
                    <option value="ALL">All Genders</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="UNISEX">Unisex</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                >
                    <option value="ALL">All Status</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                </select>

                <select
                    value={zoneFilter}
                    onChange={(e) => {
                        setZoneFilter(e.target.value);
                        setWardFilter('ALL');
                    }}
                    className="input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                >
                    <option value="ALL">All Zones</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>

                <select
                    value={wardFilter}
                    onChange={(e) => setWardFilter(e.target.value)}
                    className="input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    disabled={zoneFilter === 'ALL'}
                >
                    <option value="ALL">All Wards</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>

                {(searchQuery || typeFilter !== 'ALL' || genderFilter !== 'ALL' || statusFilter !== 'ALL' || zoneFilter !== 'ALL' || wardFilter !== 'ALL') && (
                    <button
                        className="btn btn-outline"
                        onClick={() => {
                            setSearchQuery('');
                            setTypeFilter('ALL');
                            setGenderFilter('ALL');
                            setStatusFilter('ALL');
                            setZoneFilter('ALL');
                            setWardFilter('ALL');
                        }}
                        style={{ fontSize: 13, padding: '8px 16px' }}
                    >
                        ✕ Clear Filters
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {filteredToilets.map((toilet) => (
                    <div
                        key={toilet.id}
                        className="card"
                        onClick={() => viewDetails(toilet.id)}
                        style={{ cursor: 'pointer', transition: 'all 0.2s', border: '1px solid #e2e8f0' }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                        <h3 style={{ marginBottom: 8 }}>{toilet.name}</h3>
                        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                            <strong>Ward:</strong> {toilet.ward?.name}
                        </p>
                        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>
                            <strong>Type:</strong> {toilet.type} | <strong>Gender:</strong> {toilet.gender}
                        </p>
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ padding: '4px 12px', background: toilet.status === 'APPROVED' ? '#d1fae5' : '#fef3c7', color: toilet.status === 'APPROVED' ? '#065f46' : '#92400e', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                                {toilet.status}
                            </span>
                            <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>View Details →</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
