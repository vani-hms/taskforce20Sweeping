'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";
import dynamic from "next/dynamic";
import { ModuleGuard } from "@components/Guards";

import KpiCards from "./KpiCards";
import ChartsSection from "./ChartsSection";
import LiveFeed from "./LiveFeed";

import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [beatsGeo, setBeatsGeo] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const mapCenter: [number, number] = [22.7, 75.8];

  /* LOAD DASHBOARD */
  useEffect(() => {
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  /* UPDATE TIMESTAMP */
  useEffect(() => {
    if (data) {
      setLastUpdated(new Date().toLocaleTimeString());
    }
  }, [data]);

  const load = async () => {
    try {
      const dash = await SweepingApi.adminDashboard();
      const geo = await SweepingApi.getBeatGeo();
      setData(dash);
      setBeatsGeo(geo);
    } catch (e) {
      console.error("Dashboard load failed", e);
    }
  };

  if (!data || !beatsGeo) return <div className="p-10 skeleton h-60 rounded-xl" />;

  const beatColor = (s: string) => {
    if (s === "APPROVED") return "#16a34a";
    if (s === "ACTION_REQUIRED") return "#f59e0b";
    if (s === "SUBMITTED") return "#2563eb";
    return "#94a3b8";
  };

  return (
    <ModuleGuard module="SWEEPING" roles={["CITY_ADMIN", "QC", "ACTION_OFFICER"]}>

      <div className="space-y-6">

        {/* KPI */}
        <KpiCards
          summary={data.summary}
          qc={data.qcPerformance}
          ao={data.actionOfficerStats}
        />

        {/* MAP */}
        <div className="card glass">

          <div className="flex-between mb-2">

            <div>
              <div className="font-semibold">🗺 Beat Coverage Map</div>
              <div className="text-xs muted">Last updated: {lastUpdated}</div>
            </div>

            <div className="flex gap-2 text-xs">
              <span className="badge-success">Approved</span>
              <span className="badge">Submitted</span>
              <span className="badge-warn">Action</span>
            </div>

          </div>

          <MapContainer center={mapCenter} zoom={12} style={{ height: 360 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <GeoJSON
              data={beatsGeo}
              style={(f: any) => ({
                color: beatColor(f.properties.status),
                weight: 2,
                fillOpacity: 0.4
              })}
            />

            {data.liveFeed.map((i: any) => (
              <Marker key={i.id} position={[i.latitude, i.longitude]}>
                <Popup>
                  <b>{i.sweepingBeat.geoNodeBeat.name}</b><br />
                  {i.employee?.name}<br />
                  {i.status}
                </Popup>
              </Marker>
            ))}
          </MapContainer>

        </div>

        {/* CHARTS */}
        <ChartsSection data={data} />

        {/* LIVE */}
        <LiveFeed feed={data.liveFeed} alerts={data.alerts} />

      </div>

    </ModuleGuard>
  );
}
