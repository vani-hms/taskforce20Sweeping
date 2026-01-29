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

    // Hierarchy State
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [category, setCategory] = useState("ALL");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [emp, toi, z] = await Promise.all([
                ToiletApi.listEmployees(),
                ToiletApi.listToilets(),
                ToiletApi.getZones()
            ]);
            setEmployees(emp.employees || []);
            setToilets(toi.toilets || []);
            setZones(z.zones || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedZone) {
            setWards([]);
            return;
        }
        const loadWards = async () => {
            const res = await ToiletApi.getWardsByZone(selectedZone);
            setWards(res.wards || []);
        };
        loadWards();
    }, [selectedZone]);

    const selectByWard = () => {
        if (!selectedWard) return;
        const wardToilets = toilets.filter(t => t.wardId === selectedWard || t.ward?.parentId === selectedWard);
        const wardIds = wardToilets.map(t => t.id);
        setSelectedToilets(prev => {
            const combined = new Set([...prev, ...wardIds]);
            return Array.from(combined);
        });
    };

    const toggleToilet = (toiletId: string) => {
        setSelectedToilets(prev =>
            prev.includes(toiletId)
                ? prev.filter(id => id !== toiletId)
                : [...prev, toiletId]
        );
    };

    const handleAssign = async () => {
        if (!selectedEmployee || selectedToilets.length === 0) {
            alert("Please select an employee and at least one toilet");
            return;
        }

        setAssigning(true);
        try {
            await ToiletApi.bulkAssignToilets(selectedEmployee, selectedToilets, category);
            alert(`Successfully assigned ${selectedToilets.length} toilet(s) as ${category} to employee`);
            setSelectedEmployee("");
            setSelectedToilets([]);
            await loadData();
        } catch (err: any) {
            alert(err.message || "Assignment failed");
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    const selectedEmp = employees.find(e => e.id === selectedEmployee);

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Assign Toilets to Employees</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
                {/* Employee Selection */}
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>Select Employee</h3>
                    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                        {employees.map((emp) => (
                            <div
                                key={emp.id}
                                onClick={() => setSelectedEmployee(emp.id)}
                                style={{
                                    padding: 12,
                                    marginBottom: 8,
                                    background: selectedEmployee === emp.id ? '#dbeafe' : '#f8fafc',
                                    border: selectedEmployee === emp.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <p style={{ fontWeight: 600, marginBottom: 4 }}>{emp.name}</p>
                                <p style={{ fontSize: 12, color: '#64748b' }}>{emp.email}</p>
                                <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
                                    Currently assigned: {emp.toiletsAssigned} toilet(s)
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toilet Selection */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3>Select Toilets to Assign</h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: 13 }}
                            >
                                <option value="">Select Zone</option>
                                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </select>
                            <select
                                value={selectedWard}
                                onChange={(e) => setSelectedWard(e.target.value)}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: 13 }}
                                disabled={!selectedZone}
                            >
                                <option value="">Select Ward</option>
                                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="input"
                                style={{ padding: '8px 12px', fontSize: 13 }}
                            >
                                <option value="ALL">All Categories</option>
                                <option value="CT">Community Toilet (CT)</option>
                                <option value="PT">Public Toilet (PT)</option>
                            </select>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={selectByWard}
                                disabled={!selectedWard}
                            >
                                🎯 Select Ward Toilets
                            </button>
                        </div>
                        {selectedEmployee && (
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 14, color: '#64748b' }}>
                                    Selected: <strong>{selectedToilets.length}</strong> toilet(s)
                                </p>
                                <button
                                    onClick={handleAssign}
                                    disabled={assigning || selectedToilets.length === 0}
                                    style={{
                                        marginTop: 8,
                                        padding: '8px 24px',
                                        background: assigning || selectedToilets.length === 0 ? '#94a3b8' : '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 6,
                                        cursor: assigning || selectedToilets.length === 0 ? 'not-allowed' : 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    {assigning ? 'Assigning...' : `Assign to ${selectedEmp?.name}`}
                                </button>
                            </div>
                        )}
                    </div>

                    {!selectedEmployee && (
                        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
                            <p>Please select an employee first</p>
                        </div>
                    )}

                    {selectedEmployee && (
                        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                                {toilets.map((toilet) => {
                                    const isSelected = selectedToilets.includes(toilet.id);
                                    return (
                                        <div
                                            key={toilet.id}
                                            onClick={() => toggleToilet(toilet.id)}
                                            style={{
                                                padding: 12,
                                                background: isSelected ? '#dbeafe' : 'white',
                                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    width: 20,
                                                    height: 20,
                                                    background: '#3b82f6',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: 12,
                                                    fontWeight: 700
                                                }}>
                                                    ✓
                                                </div>
                                            )}
                                            <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{toilet.name}</p>
                                            <p style={{ fontSize: 12, color: '#64748b' }}>{toilet.ward?.name}</p>
                                            <p style={{ fontSize: 12, color: '#64748b' }}>
                                                {toilet.type} | {toilet.gender}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
