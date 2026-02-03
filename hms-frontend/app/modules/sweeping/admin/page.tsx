'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

const COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

export default function SweepingAdminDashboard() {
    const [data, setData] = useState<any>(null);
    const mapCenter: [number, number] = [22.7, 75.8];

    useEffect(() => {
        import("leaflet").then(L => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
        });
    }, []);

    // REAL TIME REFRESH EVERY 10 SEC
    useEffect(() => {
        load();
        const i = setInterval(load, 10000);
        return () => clearInterval(i);
    }, []);

    const load = async () => {
        const res = await SweepingApi.adminDashboard();
        setData(res);
    };

    if (!data) return <div className="p-10">Loading Command Center…</div>;

    const donut = [
        { name: "Approved", value: data.summary.approvedToday },
        { name: "Inspected", value: data.summary.inspectedToday },
        { name: "Action", value: data.summary.actionRequired },
    ];

    const badge = (s: string) => {
        if (s === "APPROVED") return "bg-green-100 text-green-700";
        if (s === "ACTION_REQUIRED") return "bg-amber-100 text-amber-700";
        return "bg-blue-100 text-blue-700";
    };

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["CITY_ADMIN"]}>

                <div className="p-6 space-y-6 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen">

                    <h1 className="text-3xl font-bold">Municipal Command Center</h1>

                    {/* KPI */}
                    <div className="grid grid-cols-6 gap-4">
                        {[
                            ["Beats", data.summary.totalBeats, "bg-blue-50"],
                            ["Inspected", data.summary.inspectedToday, "bg-green-50"],
                            ["Approved", data.summary.approvedToday, "bg-emerald-50"],
                            ["Action", data.summary.actionRequired, "bg-amber-50"],
                            ["Coverage", `${data.summary.coveragePercent}%`, "bg-indigo-50"],
                            ["Photos", data.summary.photosToday, "bg-slate-50"],
                        ].map(([t, v, b]: any) => (
                            <div key={t} className={`p-4 rounded-xl ${b} shadow hover:shadow-xl transition`}>
                                <div className="text-xs text-gray-500">{t}</div>
                                <div className="text-3xl font-bold">{v}</div>
                            </div>
                        ))}
                    </div>

                    {/* MAP + DONUT */}
                    <div className="grid grid-cols-3 gap-6">

                        <div className="bg-white rounded-xl shadow p-3 col-span-2">
                            <b>Live Beat Map</b>
                            <MapContainer center={mapCenter} zoom={12} style={{ height: 300 }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {data.liveFeed.map((i: any) => (
                                    <Marker key={i.id} position={[i.latitude, i.longitude]}>
                                        <Popup>
                                            <b>{i.sweepingBeat.geoNodeBeat.name}</b><br />
                                            {i.status}<br />
                                            {i.employee?.name}
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>

                        <div className="bg-white rounded-xl shadow p-3">
                            <b>Approval Ratio</b>
                            <div className="h-72">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={donut} innerRadius={60} outerRadius={90} dataKey="value">
                                            {donut.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* BAR */}
                    <div className="bg-white rounded-xl shadow p-4">
                        <b>Ward Completion</b>
                        <div className="h-72">
                            <ResponsiveContainer>
                                <BarChart data={data.wardStats}>
                                    <XAxis dataKey="wardName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="completionPercent" radius={[6, 6, 0, 0]} fill="#2563eb" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* LIVE FEED */}
                    <div className="bg-white rounded-xl shadow p-4">
                        <b>Live Inspections</b>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                            {data.liveFeed.map((l: any) => (
                                <div key={l.id} className="p-3 bg-slate-50 rounded border-l-4 border-blue-600">
                                    <div className="font-semibold">{l.sweepingBeat.geoNodeBeat.name}</div>

                                    <span className={`text-xs px-2 py-1 rounded ${badge(l.status)}`}>
                                        {l.status}
                                    </span>

                                    <div className="text-xs text-gray-500">{l.employee?.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </ModuleGuard>
        </Protected>
    );
}
 