'use client';

import { useEffect, useState } from 'react';
import { ToiletApi } from '@lib/apiClient';
import { useAuth } from '@hooks/useAuth';

export default function StaffTab() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<any[]>([]);
    const [toilets, setToilets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, toiletRes, zonesRes] = await Promise.all([
                ToiletApi.listEmployees(),
                ToiletApi.listAllToilets(),
                ToiletApi.getZones()
            ]);

            const zoneMap = new Map(zonesRes.nodes.map((z: any) => [z.id, z.name]));
            const rawEmployees = empRes.employees || [];

            // Map assignments count
            const enriched = rawEmployees.map((emp: any) => {
                const assigned = (toiletRes.toilets || []).filter((t: any) =>
                    t.assignedEmployeeIds && t.assignedEmployeeIds.includes(emp.id)
                );

                // Map zone names if available
                const zoneNames = (emp.zones || []).map((zId: string) => zoneMap.get(zId) || zId).join(', ');

                return {
                    ...emp,
                    assignedCount: assigned.length,
                    assignedToilets: assigned,
                    zoneNames
                };
            });

            setEmployees(enriched);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading Staff Data...</div>;

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
                <span className="text-2xl">👥</span>
                Your Team & Assignments
            </h2>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4">{error}</div>}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Employee Name</th>
                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Assigned Zones</th>
                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Active Assignments</th>
                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">No staff found for this module.</td>
                            </tr>
                        ) : (
                            employees.map((emp) => (
                                <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="font-bold text-slate-800">{emp.name}</div>
                                        <div className="text-xs text-slate-400">{emp.email}</div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold uppercase">
                                            {emp.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm font-medium text-slate-600">
                                        {emp.zoneNames || '---'}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-black rounded-full w-8 h-8">
                                            {emp.assignedCount}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <a href={`mailto:${emp.email}`} className="text-indigo-600 font-bold text-sm hover:underline">
                                            Email
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
                <strong>Note for QC:</strong> This list shows all employees with access to the Toilet Module in your jurisdiction.
            </div>
        </div>
    );
}
