'use client';

import { useEffect, useState } from "react";
import { ToiletApi } from "@lib/apiClient";

export default function AssignmentsTab() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [toilets, setToilets] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [selectedToilets, setSelectedToilets] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    // Filters
    const [empSearch, setEmpSearch] = useState("");
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const [managingToilet, setManagingToilet] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [emp, toi, z] = await Promise.all([
                ToiletApi.listEmployees(),
                ToiletApi.listAllToilets(),
                ToiletApi.getZones()
            ]);
            setEmployees(emp.employees || []);
            setToilets(toi.toilets || []);
            setZones(z.nodes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnassignAction = async (toiletId: string, isReplace: boolean) => {
        if (!window.confirm(`Confirm ${isReplace ? 'replace' : 'unassign'}?`)) return;
        try {
            await ToiletApi.unassignToilet(selectedEmployee, toiletId);
            await loadData();
            if (isReplace) {
                document.querySelector('input[placeholder="Search assets..."]')?.parentElement?.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (err: any) {
            alert(err.message || "Operation failed.");
        } finally {
            setManagingToilet(null);
        }
    };

    useEffect(() => {
        if (!selectedZone) {
            setWards([]);
            setSelectedWard("");
            return;
        }
        const loadWards = async () => {
            const res = await ToiletApi.getWardsByZone(selectedZone);
            setWards(res.nodes || []);
        };
        loadWards();
    }, [selectedZone]);

    const toggleToilet = (toiletId: string) => {
        setSelectedToilets(prev =>
            prev.includes(toiletId)
                ? prev.filter(id => id !== toiletId)
                : [...prev, toiletId]
        );
    };

    const handleAssign = async () => {
        if (!selectedEmployee || selectedToilets.length === 0) return;
        setAssigning(true);
        try {
            await ToiletApi.bulkAssignToilets(selectedEmployee, selectedToilets, "GENERAL");
            setSelectedToilets([]);
            await loadData();
        } catch (err: any) {
            alert(err.message || "Assignment failed");
        } finally {
            setAssigning(false);
        }
    };


    const employeeCounts = toilets.reduce((acc, t) => {
        t.assignments?.forEach((a: any) => {
            acc[a.employeeId] = (acc[a.employeeId] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    const filteredEmployees = employees.filter(e =>
        e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        (e.phone && e.phone.includes(empSearch))
    );

    const filteredToilets = toilets.filter(t => {
        const isAlreadyAssignedToSelected = t.assignments?.some((a: any) => a.employeeId === selectedEmployee);
        if (isAlreadyAssignedToSelected) return false;
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWard = !selectedWard || t.wardId === selectedWard || t.ward?.parentId === selectedWard;
        return matchesSearch && matchesWard;
    });

    const selectedEmpObj = employees.find(e => e.id === selectedEmployee);
    const assignedToilets = toilets.filter(t => t.assignments?.some((a: any) => a.employeeId === selectedEmployee));

    if (loading) return (
        <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <div className="spinner" style={{ width: 24, height: 24, border: '2px solid #f3f3f3', borderTop: '2px solid #1e293b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: 13 }}>Loading...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div className="assignments-container">
            <style jsx>{`
                .assignments-container {
                    display: grid;
                    grid-template-columns: 320px 1fr;
                    gap: 24px;
                    height: calc(100vh - 180px);
                    padding: 4px;
                }
                @media (max-width: 1100px) {
                    .assignments-container {
                        grid-template-columns: 280px 1fr;
                        gap: 16px;
                    }
                }
                @media (max-width: 900px) {
                    .assignments-container {
                        grid-template-columns: 1fr;
                        height: auto;
                        overflow: visible;
                    }
                }
                .master-list {
                    background-color: #ffffff;
                    border-radius: 24px;
                    border: 1px solid #edf2f7;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05);
                }
                .detail-workspace {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* LEFT: MASTER LIST */}
            <div className="master-list">
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>Workforce</h3>
                    <div style={{ position: 'relative', marginTop: 16 }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                            value={empSearch}
                            onChange={e => setEmpSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {filteredEmployees.map(emp => (
                        <div
                            key={emp.id}
                            onClick={() => { setSelectedEmployee(emp.id); setSelectedToilets([]); }}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 12,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: 6,
                                backgroundColor: selectedEmployee === emp.id ? '#1e293b' : 'transparent',
                                border: `1px solid ${selectedEmployee === emp.id ? '#1e293b' : 'transparent'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}
                        >
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: selectedEmployee === emp.id ? '#ffffff' : '#1e293b' }}>{emp.name}</div>
                                <div style={{ fontSize: 12, color: selectedEmployee === emp.id ? '#94a3b8' : '#64748b' }}>{emp.phone || 'No phone'}</div>
                            </div>
                            <div style={{
                                minWidth: 24, padding: '2px 8px', borderRadius: 6,
                                backgroundColor: selectedEmployee === emp.id ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                                fontSize: 11, fontWeight: 700, color: selectedEmployee === emp.id ? '#ffffff' : '#475569'
                            }}>
                                {employeeCounts[emp.id] || 0}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: MANAGEMENT WORKSPACE */}
            <div className="detail-workspace">
                {selectedEmployee ? (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        {/* HEADER */}
                        <div style={{ backgroundColor: '#ffffff', padding: '24px 32px', borderRadius: 16, border: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedEmpObj?.name}</h2>
                                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                    <span style={{ fontSize: 13, color: '#64748b' }}>{selectedEmpObj?.phone || 'No phone'}</span>
                                    <span style={{ fontSize: 13, color: '#64748b' }}>{selectedEmpObj?.email}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Assigned Assets</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{assignedToilets.length}</div>
                            </div>
                        </div>

                        {/* DEPLOYMENT */}
                        <div style={{ marginBottom: 40 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Deployment</h4>
                                <div style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
                                {selectedToilets.length > 0 && (
                                    <button
                                        onClick={handleAssign}
                                        disabled={assigning}
                                        style={{ backgroundColor: '#1e293b', color: 'white', padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                                    >
                                        {assigning ? 'Assigning...' : `Assign ${selectedToilets.length}`}
                                    </button>
                                )}
                            </div>

                            <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #edf2f7', overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}>
                                        <option value="">All Zones</option>
                                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                    </select>
                                    <select value={selectedWard} onChange={e => setSelectedWard(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }} disabled={!selectedZone}>
                                        <option value="">All Wards</option>
                                        {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Search assets..."
                                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc' }}>
                                                <th style={{ width: 44, padding: '12px' }}></th>
                                                <th style={{ padding: '12px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Asset</th>
                                                <th style={{ padding: '12px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Location</th>
                                                <th style={{ padding: '12px', fontSize: 12, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredToilets.length > 0 ? filteredToilets.map(t => {
                                                const isSelected = selectedToilets.includes(t.id);
                                                const currentOwner = t.assignments?.[0]?.employee?.name;
                                                return (
                                                    <tr key={t.id} onClick={() => toggleToilet(t.id)} style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', backgroundColor: isSelected ? '#f8fafc' : 'transparent' }}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                                                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.type}</div>
                                                        </td>
                                                        <td style={{ padding: '12px', fontSize: 13 }}>{t.ward?.name}</td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, backgroundColor: currentOwner ? '#f1f5f9' : '#ecfdf5', color: currentOwner ? '#64748b' : '#059669' }}>
                                                                {currentOwner ? currentOwner : 'Available'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No assets found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ASSIGNED ASSETS */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Assigned Toilets</h4>
                                <div style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
                            </div>

                            <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #edf2f7', overflow: 'hidden' }}>
                                {assignedToilets.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', backgroundColor: '#f8fafc' }}>
                                                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Asset</th>
                                                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Location</th>
                                                <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignedToilets.map(t => (
                                                <tr key={t.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                    <td style={{ padding: '12px 20px' }}>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{t.code}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 20px', fontSize: 13 }}>{t.ward?.name}</td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            {managingToilet === t.id ? (
                                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', animation: 'fadeIn 0.2s' }}>
                                                                    <button
                                                                        onClick={() => handleUnassignAction(t.id, true)}
                                                                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 700 }}>
                                                                        REPLACE
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUnassignAction(t.id, false)}
                                                                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6, border: '1px solid #fee2e2', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                                                                        UNASSIGN
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setManagingToilet(null)}
                                                                        style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6, border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>
                                                                        CANCEL
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setManagingToilet(t.id)}
                                                                    style={{ padding: '8px 16px', fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 700 }}>
                                                                    MANAGE
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No active assignments</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #edf2f7', padding: '60px' }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Select personnel to manage assignments</h2>
                    </div>
                )}
            </div>
        </div>
    );
}
