"use client";

export default function SweepingMap({ beats = [] }: { beats: any[] }) {
  const display = beats.length
    ? beats
    : [
        { id: 1, name: "Beat A", status: "APPROVED" },
        { id: 2, name: "Beat B", status: "REJECTED" },
        { id: 3, name: "Beat C", status: "ACTION_REQUIRED" },
        { id: 4, name: "Beat D", status: "PENDING" }
      ];

  return (
    <div className="card">
      <h3>Beat Map (Visual)</h3>

      <div className="grid grid-5 mt-3">
        {display.map((b: any) => (
          <div
            key={b.id}
            className="card-hover border rounded-lg px-3 py-2 flex flex-col items-center gap-1"
            style={{ background: color(b.status) }}
          >
            <strong>{b.name}</strong>
            <span className="text-xs">{b.status}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-3 text-xs muted">
        <span>🟢 Approved</span>
        <span>🔴 Rejected</span>
        <span>🟡 Action Required</span>
        <span>⚪ Pending</span>
      </div>
    </div>
  );
}

function color(status: string) {
  if (status === "APPROVED") return "#ecfdf3";
  if (status === "REJECTED") return "#fef2f2";
  if (status === "ACTION_REQUIRED") return "#fffbeb";
  return "#f8fafc";
}




//========================= old code ===========================
// "use client";

// import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import { useEffect, useState } from "react";
// import { SweepingApi } from "@lib/apiClient";

// export default function SweepingMap() {
//   const [beats, setBeats] = useState<any[]>([]);
//   const [employees, setEmployees] = useState<any[]>([]);

//   useEffect(() => {
//     async function load() {
//       const b: any = await SweepingApi.dashboardMapBeats();
//       const e: any = await SweepingApi.dashboardEmployeeTracking();

//       setBeats(b.beats || []);
//       setEmployees(e.employees || []);
//     }

//     load();
//   }, []);

//   if (!beats.length) return <div className="card">Loading map…</div>;

//   const center = [beats[0].lat, beats[0].lng];

//   return (
//     <div className="card">
//       <h3>Live Sweeping Map</h3>

//       <div style={{ height: 420 }} className="mt-2">
//         <MapContainer
//           {...({
//             center,
//             zoom: 13,
//             style: { height: "100%", width: "100%" }
//           } as any)}
//         >
//           <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

//           {beats.map(b => (
//             <CircleMarker
//               key={b.id}
//               center={[b.lat, b.lng] as any}
//               pathOptions={{
//                 color: statusColor(b.status),
//                 fillOpacity: 0.8,
//                 radius: 7
//               }}
//             >
//               <Popup>
//                 <strong>{b.name}</strong>
//                 <br />
//                 Status: {b.status}
//               </Popup>
//             </CircleMarker>
//           ))}

//           {employees.map(e => (
//             <CircleMarker
//               key={e.id}
//               center={[e.lat, e.lng] as any}
//               pathOptions={{
//                 color: "#2563eb",
//                 fillOpacity: 1,
//                 radius: 5
//               }}
//             >
//               <Popup>
//                 {e.name}
//                 <br />
//                 {new Date(e.at).toLocaleTimeString()}
//               </Popup>
//             </CircleMarker>
//           ))}
//         </MapContainer>
//       </div>
//     </div>
//   );
// }

// function statusColor(status: string) {
//   if (status === "APPROVED") return "#16a34a";
//   if (status === "REJECTED" || status === "ACTION_REQUIRED") return "#dc2626";
//   return "#f59e0b";
// }
