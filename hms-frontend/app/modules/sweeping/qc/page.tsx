'use client';

import { useEffect, useState } from "react";
import { SweepingApi, EmployeesApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import PhotoViewer from "./PhotoViewer";
import { useRouter } from "next/navigation";

type Tab = "assign" | "pending" | "action" | "history";

export default function QcSweepingPage() {
  const [tab, setTab] = useState<Tab>("assign");

  return (
    <Protected>
      <ModuleGuard module="SWEEPING" roles={["QC"]}>
        <div className="content page">

          <h1>Sweeping QC Console</h1>

          <div className="tab-bar">
            {["assign", "pending", "action", "history"].map(t => (
              <button
                key={t}
                className={`tab ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t as Tab)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {tab === "assign" && <BeatAssignment />}
          {tab === "pending" && <InspectionList status="REVIEW_PENDING" />}
          {tab === "action" && <InspectionList status="ACTION_REQUIRED" />}
          {tab === "history" && <InspectionList />}

        </div>
      </ModuleGuard>
    </Protected>
  );
}

/* ================= ASSIGN ================= */

function BeatAssignment() {
  const [beats, setBeats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [beatId, setBeatId] = useState("");
  const [empId, setEmpId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const beatsRes = await SweepingApi.qcBeats();
    setBeats(beatsRes.beats || []);

    const empRes = await EmployeesApi.list("SWEEPING");
    setEmployees(empRes.employees || []);
  };

  useEffect(() => { load(); }, []);

  const assign = async () => {
    if (!beatId || !empId) return alert("Select beat + employee");

    setLoading(true);

    await SweepingApi.assignBeat({
      sweepingBeatId: beatId,
      employeeId: empId
    });

    alert("Beat Assigned");
    setBeatId("");
    setEmpId("");
    await load();
    setLoading(false);
  };

  return (
    <div className="card card-hover card-spacious">
      <h3>Beat Assignment</h3>

      <div className="form-grid mt-2">

        <select className="select" value={beatId} onChange={e => setBeatId(e.target.value)}>
          <option value="">Select Beat</option>
          {beats.map(b => (
            <option key={b.id} value={b.id} disabled={b.assignmentStatus === "ACTIVE"}>
              {b.geoNodeBeat?.name} — {b.assignmentStatus}
            </option>
          ))}
        </select>

        <select className="select" value={empId} onChange={e => setEmpId(e.target.value)}>
          <option value="">Select Employee</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

      </div>

      <Button className="mt-4" disabled={loading} onClick={assign}>
        {loading ? "Assigning..." : "Assign Beat"}
      </Button>
    </div>
  );
}

/* ================= INSPECTIONS ================= */

function InspectionList({ status }: { status?: string }) {
  const [list, setList] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    SweepingApi.qcInspections().then((r: any) => {
      const data = status
        ? r.inspections.filter((x: any) => x.status === status)
        : r.inspections;

      setList(data || []);
    });
  }, [status]);

  if (selected) {
    return <InspectionDetail inspection={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="grid grid-3">
      {list.map(item => (
        <div key={item.id} className="card card-hover">
          <div>
            <div className="font-semibold">{item.employee?.name}</div>
            <div className="text-sm">{item.sweepingBeat?.geoNodeBeat?.name}</div>
            <span className={`badge ${statusColor(item.status)}`}>{item.status}</span>
          </div>

          <button className="btn btn-secondary btn-sm mt-2" onClick={() => setSelected(item)}>
            View
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================= DETAIL ================= */

function InspectionDetail({ inspection, onBack }: any) {
  const router = useRouter();
  const [showPhotos, setShowPhotos] = useState(false);

  const decide = async (
    decision: "APPROVED" | "REJECTED" | "ACTION_REQUIRED"
  ) => {
    await SweepingApi.qcDecision(inspection.id, decision);

    onBack(); // return to list

    router.refresh?.(); // optional if using app router
  };




  return (
    <Card>
      <Button onClick={onBack}>← Back</Button>

      <h3>Inspection</h3>

      {inspection.answers?.map((a: any, i: number) => (
        <div key={i}>{a.questionCode}: {a.answer ? "YES" : "NO"}</div>
      ))}

      <Button className="btn-secondary mt-2" onClick={() => setShowPhotos(true)}>
        View Photos
      </Button>

      <div className="mt-3">
        <Button onClick={() => decide("APPROVED")}>Approve</Button>
        <Button onClick={() => decide("REJECTED")} className="ml-2">Reject</Button>
        <Button onClick={() => decide("ACTION_REQUIRED")} className="ml-2">Action Required</Button>
      </div>

      {showPhotos && (
        <PhotoViewer
          photos={inspection.photosFlat?.map((p: any) => p.photoUrl)}
          onClose={() => setShowPhotos(false)}
        />
      )}
    </Card>
  );
}

function statusColor(s: string) {
  if (s === "APPROVED") return "badge-success";
  if (s === "REJECTED") return "badge-error";
  if (s === "ACTION_REQUIRED") return "badge-warn";
  return "";
}






// 'use client';

// import { useEffect, useState } from "react";
// import { SweepingApi, EmployeesApi } from "@lib/apiClient";
// import { Protected, ModuleGuard } from "@components/Guards";
// import { Card } from "@components/ui/Card";
// import { Button } from "@components/ui/Button";
// import PhotoViewer from "./PhotoViewer";
// import { useRouter } from "next/navigation";
// import Link from "next/link";


// type Tab = "assign" | "pending" | "action" | "history";

// export default function QcSweepingPage() {
//   const [tab, setTab] = useState<Tab>("assign");


//   return (
//     <Protected>
//       {/* 🔐 QC + SWEEPING MODULE GUARD */}
//       <ModuleGuard module="SWEEPING" roles={["QC"]}>
//         <div className="content page">

//           <h1>Sweeping QC Console</h1>

//           <div className="tab-bar">
//             {["assign", "pending", "action", "history"].map(t => (
//               <button
//                 key={t}
//                 className={`tab ${tab === t ? "active" : ""}`}
//                 onClick={() => setTab(t as Tab)}
//               >
//                 {t.toUpperCase()}
//               </button>
//             ))}
//           </div>

//           {tab === "assign" && <BeatAssignment />}
//           {tab === "pending" && <InspectionList status="REVIEW_PENDING" />}
//           {tab === "action" && <InspectionList status="ACTION_REQUIRED" />}
//           {tab === "history" && <InspectionList />}

//         </div>
//       </ModuleGuard>
//     </Protected>
//   );
// }

// /* ================= ASSIGN ================= */

// function BeatAssignment() {
//   const [beats, setBeats] = useState<any[]>([]);
//   const [employees, setEmployees] = useState<any[]>([]);
//   const [beatId, setBeatId] = useState("");
//   const [empId, setEmpId] = useState("");
//   const [loading, setLoading] = useState(false);

//   const load = async () => {
//     try {
//       const beatsRes = await SweepingApi.qcBeats();
//       setBeats(beatsRes.beats || []);

//       const empRes = await EmployeesApi.list("SWEEPING");
//       setEmployees(empRes.employees || []);

//     } catch (err) {
//       console.error(err);
//       alert("Failed to load beats or employees (backend QC permission)");
//     }
//   };

//   useEffect(() => {
//     load();
//   }, []);

//   const assign = async () => {
//     if (!beatId || !empId) return alert("Select beat + employee");

//     try {
//       setLoading(true);

//       await SweepingApi.assignBeat({
//         sweepingBeatId: beatId,
//         employeeId: empId
//       });

//       alert("Beat Assigned");

//       setBeatId("");
//       setEmpId("");

//       await load();

//     } catch (e) {
//       console.error(e);
//       alert("Assignment failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="card card-hover card-spacious">
//       <h3>Beat Assignment</h3>

//       <div className="form-grid mt-2">

//         <select
//           className="select"
//           value={beatId}
//           onChange={e => setBeatId(e.target.value)}
//         >
//           <option value="">Select Beat</option>
//           {beats.map(b => (
//             <option
//               key={b.id}
//               value={b.id}
//               disabled={b.assignmentStatus === "ACTIVE"}
//             >
//               {b.geoNodeBeat?.name} — {b.assignmentStatus}
//             </option>
//           ))}
//         </select>

//         <select
//           className="select"
//           value={empId}
//           onChange={e => setEmpId(e.target.value)}
//         >
//           <option value="">Select Employee</option>
//           {employees.map(e => (
//             <option key={e.id} value={e.id}>
//               {e.name}
//             </option>
//           ))}
//         </select>

//       </div>

//       <Button className="mt-4" disabled={loading} onClick={assign}>
//         {loading ? "Assigning..." : "Assign Beat"}
//       </Button>
//     </div>
//   );
// }

// /* ================= INSPECTIONS ================= */

// function InspectionList({ status }: { status?: string }) {
//   const [list, setList] = useState<any[]>([]);
//   const [selected, setSelected] = useState<any>(null);

//   useEffect(() => {
//     SweepingApi.qcInspections().then((r: any) => {
//       const data = status
//         ? r.inspections.filter((x: any) => x.status === status)
//         : r.inspections;

//       setList(data || []);
//     });
//   }, [status]);

//   if (selected) {
//     return <InspectionDetail inspection={selected} onBack={() => setSelected(null)} />;
//   }

//   return (
//     <div className="grid grid-3">
//       {list.map((item: any) => (
//         <div key={item.id} className="card card-hover">
//           <div className="space-y-1">
//             <div className="font-semibold">{item.employee?.name}</div>

//             <div className="text-sm">
//               {item.sweepingBeat?.geoNodeBeat?.name}
//             </div>

//             <span className={`badge ${statusColor(item.status)}`}>
//               {item.status}
//             </span>
//           </div>

//           <button
//             className="btn btn-secondary btn-sm mt-2"
//             onClick={() => setSelected(item)}
//           >
//             View
//           </button>
//         </div>
//       ))}
//     </div>
//   );
// }

// /* ================= DETAIL ================= */

// function InspectionDetail({ inspection, onBack }: any) {
//   const [showPhotos, setShowPhotos] = useState(false);
//   const router = useRouter();
//   const decide = async (decision: any) => {
//     await SweepingApi.qcDecision(inspection.id, "ACTION_REQUIRED");
//     onBack();


//     await SweepingApi.qcDecision(inspection.id, decision);

//     router.push("/modules/sweeping/qc/dashboard");
//   };



//   return (
//     <Card>
//       <Button onClick={onBack}>← Back</Button>

//       <h3>Inspection</h3>

//       {inspection.answers?.map((a: any, idx: number) => (
//         <div key={idx}>
//           {a.questionCode}: {a.answer ? "YES" : "NO"}
//         </div>
//       ))}

//       <Button className="btn-secondary mt-2" onClick={() => setShowPhotos(true)}>
//         View Photos
//       </Button>

//       <div className="mt-3">
//         <Button onClick={() => decide("APPROVED")}>Approve</Button>
//         <Button onClick={() => decide("REJECTED")} className="ml-2">Reject</Button>
//         <Button onClick={() => decide("ACTION_REQUIRED")} className="ml-2">
//           Action Required
//         </Button>
//       </div>

//       {showPhotos && (
//         <PhotoViewer
//           photos={inspection.photos}
//           onClose={() => setShowPhotos(false)}
//         />
//       )}
//     </Card>
//   );
// }

// function statusColor(s: string) {
//   if (s === "APPROVED") return "badge-success";
//   if (s === "REJECTED") return "badge-error";
//   if (s === "ACTION_REQUIRED") return "badge-warn";
//   return "";
// }
