"use client";

import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { SweepingApi } from "@lib/apiClient";
import SweepingMap from "./admin/SweepingMap";

export default function SweepingAdminPage() {
  const [summary, setSummary] = useState<any>({});
  const [sla, setSla] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const summaryRes: any = await SweepingApi.dashboardSummary();
        const qcRes: any = await SweepingApi.dashboardQcSla();
        const empRes: any = await SweepingApi.dashboardEmployeeTracking();
        const wardRes: any = await SweepingApi.dashboardWardLeaderboard();
        const mapRes: any = await SweepingApi.dashboardMapBeats();

        setSummary(summaryRes || {});
        setSla(qcRes?.pending || []);
        setEmployees(empRes?.employees || []);
        setWards(wardRes?.leaderboard || []);
        setBeats(mapRes?.beats || []);
      } catch {
        // empty state fallback
      }
    }

    load();
  }, []);

  return (

    <div className="page space-y-6 sweeping-admin">

      {/* HERO */}
      <div className="hero">
        <div className="eyebrow">Municipal Command Center</div>
        <h1>Sweeping Operations</h1>
        <p>Real-time cleanliness intelligence</p>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-5">
        <Kpi title="Pending QC" value={summary.pendingQc} color="orange" />
        <Kpi title="Active Beats" value={summary.activeBeats} color="blue" />
        <Kpi title="Action Required" value={summary.actionRequired} color="red" />
        <Kpi title="Approved Today" value={summary.approvedToday} color="green" />
        <Kpi title="Total Beats" value={summary.totalBeats} color="slate" />
      </div>

      {/* MAP */}
      <SweepingMap beats={beats} />

      <div className="grid grid-3">

        {/* QC SLA */}
        <div className="card">
          <h3>QC SLA</h3>
          <div className="space-y-2 mt-2">
            {(sla.length ? sla : [{ id: "—", minutes: 0 }]).map((s: any, i) => (
              <div key={i} className="flex-between">
                <span>{s.id?.slice?.(0, 6) || "No data"}</span>
                <span className={s.minutes > 60 ? "text-red-600" : "text-green-700"}>
                  {s.minutes || 0} min
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* EMPLOYEE TRACK */}
        <div className="card">
          <h3>Employee Activity</h3>
          <ul className="list mt-2">
            {(employees.length ? employees : [{ name: "No activity", at: Date.now() }]).map((e: any, i) => (
              <li key={i} className="flex-between">
                <span>{e.name}</span>
                <span className="text-xs muted">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* WARD LEADERBOARD */}
        <div className="card">
          <h3>Ward Ranking</h3>
          <div className="space-y-2 mt-2">
            {(wards.length ? wards : [{ wardId: "—", count: 0 }]).slice(0, 5).map((w: any, i) => (
              <div key={i} className="flex-between">
                <strong>#{i + 1}</strong>
                <span>{w.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>

  );
}

/* ================= KPI ================= */

function Kpi({ title, value, color }: any) {
  return (
    <div className="card card-hover border">
      <div className="muted text-xs">{title}</div>
      <div className="text-lg mt-2">{value ?? 0}</div>
      <div className={`mt-2 h-1 rounded-lg bg-${color || "slate"}-500`} />
    </div>
  );
}


//============================= old code ==================================

// "use client";

// import { useEffect, useState } from "react";
// import { SweepingApi } from "@lib/apiClient";
// import SweepingMap from "./admin/SweepingMap";
// import SweepingCharts from "./admin/SweepingCharts";


// export default function SweepingDashboard() {
//   const [summary, setSummary] = useState<any>();
//   const [sla, setSla] = useState<any[]>([]);
//   const [employees, setEmployees] = useState<any[]>([]);
//   const [wards, setWards] = useState<any[]>([]);

//  useEffect(() => {
//   async function load() {
//     const summaryRes: any = await SweepingApi.dashboardSummary();
//     const qcRes: any = await SweepingApi.dashboardQcSla();
//     const empRes: any = await SweepingApi.dashboardEmployeeTracking();
//     const wardRes: any = await SweepingApi.dashboardWardLeaderboard();

//     setSummary(summaryRes);
//     setSla(qcRes.pending || []);
//     setEmployees(empRes.employees || []);
//     setWards(wardRes.leaderboard || []);
//   }

//   load();
// }, []);


//   return (
//     <div className="page space-y-6">

//       {/* HERO */}
//       <div className="hero">
//         <div className="eyebrow">Municipal Command Center</div>
//         <h1>Sweeping Operations</h1>
//         <p>Real-time cleanliness intelligence</p>
//       </div>

//       {/* KPI ROW */}
//       <div className="grid grid-5">
//         <Stat title="Pending QC" value={summary?.pendingQc} />
//         <Stat title="Active Beats" value={summary?.activeBeats} />
//         <Stat title="Action Required" value={summary?.actionRequired} />
//         <Stat title="Approved Today" value={summary?.approvedToday} />
//         <Stat title="Total Beats" value={summary?.totalBeats} />
//       </div>

//       {/* MAP */}
//       <SweepingMap />

//       <div className="grid grid-3">

//         {/* QC SLA */}
//         <div className="card">
//           <h3>QC SLA</h3>
//           <div className="space-y-2 mt-2">
//             {sla.map(s => (
//               <div key={s.id} className="flex-between">
//                 <span>{s.id.slice(0, 6)}</span>
//                 <span className={s.minutes > 60 ? "text-red-600" : "text-green-700"}>
//                   {s.minutes} min
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* EMPLOYEE TRACK */}
//         <div className="card">
//           <h3>Employee Activity</h3>
//           <ul className="list mt-2">
//             {employees.map(e => (
//               <li key={e.id} className="flex-between">
//                 <span>{e.name}</span>
//                 <span className="text-xs muted">
//                   {new Date(e.at).toLocaleTimeString()}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         </div>

//         {/* WARD LEADERBOARD */}
//         <div className="card">
//           <h3>Ward Ranking</h3>
//           <div className="space-y-2 mt-2">
//             {wards.slice(0, 5).map((w, i) => (
//               <div key={w.wardId} className="flex-between">
//                 <strong>#{i + 1}</strong>
//                 <span>{w.count}</span>
//               </div>
//             ))}
//           </div>
//         </div>

//       </div>

//     </div>
//   );
// }

// function Stat({ title, value }: any) {
//   return (
//     <div className="card card-hover">
//       <div className="muted text-xs">{title}</div>
//       <div className="text-lg mt-2">{value ?? "-"}</div>
//     </div>
//   );
// }
