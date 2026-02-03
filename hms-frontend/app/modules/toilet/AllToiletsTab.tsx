'use client';

import { useEffect, useState } from "react";
import { ToiletApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function AllToiletsTab() {
    const { user } = useAuth();
    const isAdmin = user?.roles?.includes('CITY_ADMIN') || user?.roles?.includes('HMS_SUPER_ADMIN');

    const [toilets, setToilets] = useState<any[]>([]);
    const [filteredToilets, setFilteredToilets] = useState<any[]>([]);
    const [selectedToilet, setSelectedToilet] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Assignment Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [toiletToAssign, setToiletToAssign] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [assigningLoading, setAssigningLoading] = useState(false);

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CT' | 'PT' | 'URINALS'>('ALL');
    const [zoneFilter, setZoneFilter] = useState('ALL');
    const [wardFilter, setWardFilter] = useState('ALL');
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (zoneFilter === 'ALL') {
            setWards([]);
            setWardFilter('ALL');
            return;
        }
        loadWards(zoneFilter);
    }, [zoneFilter]);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, typeFilter, zoneFilter, wardFilter, toilets]);

    const loadData = async () => {
        try {
            const [toi, z, emp] = await Promise.all([
                ToiletApi.listAllToilets(),
                ToiletApi.getZones(),
                ToiletApi.listEmployees()
            ]);
            setToilets(toi.toilets || []);
            setZones(z.nodes || []);
            setEmployees(emp.employees || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadWards = async (zoneId: string) => {
        try {
            const res = await ToiletApi.getWardsByZone(zoneId);
            setWards(res.nodes || []);
        } catch (err) { console.error(err); }
    };

    const applyFilters = () => {
        let filtered = [...toilets];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.name?.toLowerCase().includes(query) ||
                t.code?.toLowerCase().includes(query) ||
                t.ward?.name?.toLowerCase().includes(query)
            );
        }
        if (typeFilter !== 'ALL') filtered = filtered.filter(t => t.type === typeFilter);
        if (zoneFilter !== 'ALL' && wardFilter === 'ALL') filtered = filtered.filter(t => t.ward?.parentId === zoneFilter || t.ward?.id === zoneFilter);
        if (wardFilter !== 'ALL') filtered = filtered.filter(t => t.wardId === wardFilter || t.ward?.parentId === wardFilter);
        setFilteredToilets(filtered);
    };

    const handleQuickAssign = async (employeeId: string) => {
        if (!toiletToAssign) return;
        setAssigningLoading(true);
        try {
            await ToiletApi.bulkAssignToilets(employeeId, [toiletToAssign.id], toiletToAssign.type);
            setShowAssignModal(false);
            setToiletToAssign(null);
            await loadData();
        } catch (err) {
            alert("Assignment failed");
        } finally {
            setAssigningLoading(false);
        }
    };

    if (selectedToilet) {
        return (
            <div style={{ backgroundColor: '#ffffff', borderRadius: 32, padding: 40, border: '1px solid #edf2f7', animation: 'fadeIn 0.3s' }}>
                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <button
                    onClick={() => setSelectedToilet(null)}
                    style={{ marginBottom: 32, padding: '10px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    ← Return to Fleet List
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 48 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>{selectedToilet.name}</h2>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: 8 }}>{selectedToilet.status}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>ID: {selectedToilet.code || 'UNTAGGED_ASSET'}</span>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48 }}>
                            <div>
                                <h3 style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 20, textTransform: 'uppercase' }}>Technical Specifications</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { l: 'Category', v: selectedToilet.type, i: '🏢' },
                                        { l: 'Intended Gender', v: selectedToilet.gender, i: '⚖️' },
                                        { l: 'Seat Capacity', v: selectedToilet.numberOfSeats || 0, i: '🪑' },
                                        { l: 'Compliance', v: 'Standard', i: '🛡️' }
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, alignItems: 'center' }}>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>{item.i} {item.l}</span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 20, textTransform: 'uppercase' }}>Geographic Context</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { l: 'Location Ward', v: selectedToilet.ward?.name, i: '📍' },
                                        { l: 'Primary Zone', v: selectedToilet.ward?.parent?.name || 'N/A', i: '🌐' },
                                        { l: 'Positioning', v: `${selectedToilet.latitude.toFixed(4)}, ${selectedToilet.longitude.toFixed(4)}`, i: '🛰️' }
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, alignItems: 'center' }}>
                                            <span style={{ color: '#64748b', fontWeight: 500 }}>{item.i} {item.l}</span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 48 }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 20, textTransform: 'uppercase' }}>Operational Infrastructure</h3>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[
                                    { k: 'Running Water', v: selectedToilet.hasWater, icon: '💧' },
                                    { k: 'Power Grid', v: selectedToilet.hasElectricity, icon: '⚡' },
                                    { k: 'Sanitation Area', v: selectedToilet.hasHandwash, icon: '🧼' }
                                ].map((f, i) => (
                                    <div key={i} style={{ padding: '12px 20px', borderRadius: 16, backgroundColor: f.v ? '#ffffff' : '#f8fafc', color: f.v ? '#0f172a' : '#cbd5e1', border: f.v ? '2px solid #e2e8f0' : '1px solid #f1f5f9', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ opacity: f.v ? 1 : 0.4 }}>{f.icon}</span> {f.k}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: 32, borderRadius: 32, border: '1px solid #edf2f7' }}>
                        <h3 style={{ fontSize: 12, fontWeight: 900, color: '#1e293b', marginBottom: 24, letterSpacing: '0.05em' }}>ASSIGNED COMMAND CENTER</h3>
                        {selectedToilet.assignments?.map((a: any) => (
                            <div key={a.id} style={{ padding: '16px 20px', backgroundColor: 'white', borderRadius: 20, marginBottom: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{a.employee.name}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{a.employee.email}</div>
                                </div>
                            </div>
                        ))}
                        {!selectedToilet.assignments?.length && (
                            <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🚫</div>
                                <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Currently Unassigned</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40, border: '4px solid #f3f3f3', borderTop: '4px solid #1e293b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Syncing Global Assets...</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>Asset Registry</h2>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14, fontWeight: 500 }}>Total Registered Assets: {filteredToilets.length}</p>
                </div>
                {isAdmin && (
                    <a href="/modules/toilet/bulk-import" style={{ backgroundColor: '#1e293b', color: 'white', padding: '14px 28px', borderRadius: 16, textDecoration: 'none', fontWeight: 800, fontSize: 14, boxShadow: '0 10px 15px -3px rgba(30,41,59,0.3)' }}>
                        📥 Register New
                    </a>
                )}
            </div>

            {/* Premium Controls */}
            <div style={{ backgroundColor: 'white', padding: 28, borderRadius: 28, border: '1px solid #edf2f7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: 24 }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.3 }}>🔍</span>
                        <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: 15, borderRadius: 16, border: '1px solid #e2e8f0', backgroundColor: '#fcfdfe', outline: 'none' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={{ padding: '12px 20px', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 13, backgroundColor: '#ffffff', fontWeight: 700, color: '#475569', outline: 'none' }}>
                        <option value="ALL">All Structure Types</option>
                        <option value="CT">Community Toilet (CT)</option>
                        <option value="PT">Public Toilet (PT)</option>
                        <option value="URINALS">Urinals</option>
                    </select>
                    <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} style={{ padding: '12px 20px', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 13, backgroundColor: '#ffffff', fontWeight: 700, color: '#475569', outline: 'none' }}>
                        <option value="ALL">All Zones</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} disabled={zoneFilter === 'ALL'} style={{ padding: '12px 20px', borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 13, backgroundColor: zoneFilter === 'ALL' ? '#f8fafc' : '#ffffff', fontWeight: 700, color: '#475569', outline: 'none' }}>
                        <option value="ALL">All Wards</option>
                        {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
            </div>

            {/* High Density Table */}
            <div style={{ backgroundColor: 'white', borderRadius: 28, border: '1px solid #edf2f7', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#fcfdfe' }}>
                            {['TOILET NAME & CODE', 'ZONE & WARD', 'TYPE & CAPACITY', 'STATUS', ''].map((h, i) => (
                                <th key={i} style={{ padding: '20px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#0f172a', letterSpacing: '0.1em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredToilets.map((toilet) => (
                            <tr key={toilet.id} style={{ transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <td style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc' }}>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{toilet.name}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{toilet.code || 'NO_ID'}</div>
                                </td>
                                <td style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{toilet.ward?.name || '---'}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{toilet.ward?.parent?.name || '---'}</div>
                                </td>
                                <td style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 10, fontWeight: 900, background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: 8 }}>{toilet.type}</span>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{toilet.numberOfSeats || 0} Seats</span>
                                    </div>
                                </td>
                                <td style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc' }}>
                                    <span style={{ padding: '6px 14px', borderRadius: 10, fontSize: 10, fontWeight: 900, backgroundColor: toilet.status === 'APPROVED' ? '#ecfdf5' : '#fffbeb', color: toilet.status === 'APPROVED' ? '#059669' : '#d97706', textTransform: 'uppercase' }}>{toilet.status}</span>
                                </td>
                                <td style={{ padding: '20px 24px', borderBottom: '1px solid #f8fafc', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        {isAdmin && (
                                            <button
                                                onClick={() => { setToiletToAssign(toilet); setShowAssignModal(true); }}
                                                style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: '#1e293b', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = '#94a3b8'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                            >Assign Staff</button>
                                        )}
                                        <button onClick={() => setSelectedToilet(toilet)} style={{ backgroundColor: '#1e293b', border: 'none', padding: '8px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: 'white' }}>Profile</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quick Assign Modal */}
            {showAssignModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: 28, width: 440, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'modalScale 0.2s ease-out' }}>
                        <style>{`@keyframes modalScale { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>Assign Field Associate</h3>
                        <p style={{ margin: '8px 0 24px 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>Delegate responsibility for <strong>{toiletToAssign?.name}</strong></p>

                        <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px' }}>
                            {employees.map(emp => (
                                <div
                                    key={emp.id}
                                    onClick={() => handleQuickAssign(emp.id)}
                                    style={{ padding: '14px 16px', borderRadius: 16, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                                >
                                    <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{emp.name}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{emp.phone || 'No phone'}</div>
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>{emp.toiletsAssigned || 0} Assets</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => { setShowAssignModal(false); setToiletToAssign(null); }}
                                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: 'transparent', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#64748b' }}
                            >Cancel</button>
                            {assigningLoading && <div style={{ flex: 1, textAlign: 'center', fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Syncing...</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
