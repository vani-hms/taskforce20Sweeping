// 'use client';

// import { useEffect, useState } from "react";
// import { SweepingApi, EmployeesApi } from "@lib/apiClient";
// import { Protected, ModuleGuard } from "@components/Guards";
// import { Card } from "@components/ui/Card";
// import { Button } from "@components/ui/Button";

// const STATUS_COLOR: any = {
//     SUBMITTED: "#fde68a",
//     APPROVED: "#dcfce7",
//     REJECTED: "#fee2e2",
//     ACTION_REQUIRED: "#fed7aa",
//     ACTION_SUBMITTED: "#dbeafe"
// };

// export default function QcSweepingPage() {
//     const [tab, setTab] = useState<"assign" | "inspect">("assign");

//     return (
//         <Protected>
//             <ModuleGuard module="SWEEPING" roles={["QC"]}>
//                 <div style={{ padding: 24 }}>

//                     <h2>QC – Sweeping Module</h2>
//                     <p style={{ color: "#6b7280" }}>
//                         Assign beats and validate field inspections
//                     </p>

//                     <div style={{ marginTop: 16 }}>
//                         <Button onClick={() => setTab("assign")}>Assign Beats</Button>
//                         <Button onClick={() => setTab("inspect")} style={{ marginLeft: 8 }}>
//                             Inspections
//                         </Button>
//                     </div>

//                     {tab === "assign" ? <BeatAssignment /> : <InspectionList />}

//                 </div>
//             </ModuleGuard>
//         </Protected>
//     );
// }

// /* ================= ASSIGN ================= */

// function BeatAssignment() {
//     const [beats, setBeats] = useState<any[]>([]);
//     const [employees, setEmployees] = useState<any[]>([]);
//     const [beatId, setBeatId] = useState("");
//     const [empId, setEmpId] = useState("");

//     const load = async () => {
//         const b = await SweepingApi.qcBeats();
//         const e = await EmployeesApi.list("SWEEPING");
//         setBeats(b.beats || []);
//         setEmployees(e.employees || []);
//     };

//     useEffect(() => {
//         load();
//     }, []);

//     const assign = async () => {
//         if (!beatId || !empId) return alert("Select beat and employee");

//         if (beats.find(b => b.id === beatId)?.assignedEmployeeId)
//             return alert("Beat already assigned");

//         await SweepingApi.assignBeat({
//             sweepingBeatId: beatId,
//             employeeId: empId
//         });

//         alert("Beat assigned");
//         load();
//     };

//     return (
//         <div style={{ marginTop: 20 }}>
//             <Card>
//                 <h3>Assign Beat to Employee</h3>

//                 <select className="input" onChange={e => setBeatId(e.target.value)}>
//                     <option value="">Select Beat</option>
//                     {beats.map(b => (
//                         <option key={b.id} value={b.id}>
//                             {b.geoNodeBeat?.name || b.id} {b.assignedEmployeeId ? "(Assigned)" : ""}
//                         </option>
//                     ))}
//                 </select>

//                 <select className="input" onChange={e => setEmpId(e.target.value)} style={{ marginTop: 10 }}>
//                     <option value="">Select Employee</option>
//                     {employees.map(e => (
//                         <option key={e.id} value={e.id}>{e.name}</option>
//                     ))}
//                 </select>

//                 <Button style={{ marginTop: 12 }} onClick={assign}>
//                     Assign Beat
//                 </Button>
//             </Card>
//         </div>
//     );
// }

// /* ================= INSPECTIONS ================= */

// function InspectionList() {
//     const [list, setList] = useState<any[]>([]);
//     const [selected, setSelected] = useState<any>(null);

//     const load = async () => {
//         const r = await SweepingApi.qcInspections();
//         setList(r.inspections || []);
//     };

//     useEffect(() => {
//         load();
//     }, []);

//     if (selected) {
//         return <InspectionDetail inspection={selected} onBack={() => { setSelected(null); load(); }} />;
//     }

//     return (
//         <div style={{ marginTop: 20 }}>

//             {list.length === 0 && <p>No inspections yet.</p>}

//             {list.map(i => (
//                 <div key={i.id} style={{ marginBottom: 12 }}>
//                     <Card>


//                         <b>{i.sweepingBeat?.geoNodeBeat?.name}</b>
//                         <div style={{ color: "#6b7280" }}>Employee: {i.employee?.name}</div>

//                         <div
//                             style={{
//                                 marginTop: 6,
//                                 display: "inline-block",
//                                 background: STATUS_COLOR[i.status],
//                                 padding: "4px 10px",
//                                 borderRadius: 10
//                             }}
//                         >
//                             {i.status.replace("_", " ")}
//                         </div>

//                         <Button onClick={() => setSelected(i)} style={{ marginTop: 10 }}>
//                             View Details
//                         </Button>

//                     </Card>
//                 </div>

//             ))}
//         </div>
//     );
// }

// /* ================= DETAIL ================= */

// function InspectionDetail({ inspection, onBack }: any) {
//     const decide = async (decision: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
//         if (inspection.status === "APPROVED" || inspection.status === "REJECTED")
//             return alert("Already closed");

//         if (!confirm(`Confirm ${decision.replace("_", " ")}?`)) return;

//         await SweepingApi.qcDecision(inspection.id, decision);
//         alert("Decision saved");
//         onBack();
//     };

//     return (
//         <Card>

//             <Button onClick={onBack}>← Back</Button>

//             <h3>Inspection Review</h3>

//             {inspection.answers?.map((a: any, idx: number) => (
//                 <div key={idx}>
//                     {a.questionCode}: {a.answer ? "YES" : "NO"}
//                 </div>
//             ))}

//             <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
//                 <Button onClick={() => decide("APPROVED")}>Approve</Button>
//                 <Button onClick={() => decide("REJECTED")}>Reject</Button>
//                 <Button onClick={() => decide("ACTION_REQUIRED")}>
//                     Action Required
//                 </Button>
//             </div>

//         </Card>
//     );
// }
'use client';

import { useEffect, useState } from "react";
import { SweepingApi, EmployeesApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { SWEEPING_QUESTIONS } from "./questions";

const STATUS_COLOR: any = {
    SUBMITTED: "#fde68a",
    APPROVED: "#dcfce7",
    REJECTED: "#fee2e2",
    ACTION_REQUIRED: "#fed7aa",
    ACTION_SUBMITTED: "#dbeafe"
};

export default function QcSweepingPage() {
    const [tab, setTab] = useState<"assign" | "inspect">("assign");

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["QC"]}>
                <div style={{ padding: 24 }}>

                    <h2>QC – Sweeping Module</h2>
                    <p style={{ color: "#6b7280" }}>
                        Assign beats and validate field inspections
                    </p>

                    <div style={{ marginTop: 16 }}>
                        <Button onClick={() => setTab("assign")}>Assign Beats</Button>
                        <Button onClick={() => setTab("inspect")} style={{ marginLeft: 8 }}>
                            Inspections
                        </Button>
                    </div>

                    {tab === "assign" ? <BeatAssignment /> : <InspectionList />}

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

    const load = async () => {
        const b = await SweepingApi.qcBeats();
        const e = await EmployeesApi.list("SWEEPING");
        setBeats(b.beats || []);
        setEmployees(e.employees || []);
    };

    useEffect(() => {
        load();
    }, []);

    const assign = async () => {
        if (!beatId || !empId) return alert("Select beat and employee");

        if (beats.find(b => b.id === beatId)?.assignedEmployeeId)
            return alert("Beat already assigned");

        await SweepingApi.assignBeat({
            sweepingBeatId: beatId,
            employeeId: empId
        });

        alert("Beat assigned");
        load();
    };

    return (
        <div style={{ marginTop: 20 }}>
            <Card>
                <h3>Assign Beat to Employee</h3>

                <select className="input" onChange={e => setBeatId(e.target.value)}>
                    <option value="">Select Beat</option>
                    {beats.map(b => (
                        <option key={b.id} value={b.id}>
                            {b.geoNodeBeat?.name} {b.assignedEmployeeId ? "(Assigned)" : ""}
                        </option>
                    ))}
                </select>

                <select className="input" onChange={e => setEmpId(e.target.value)} style={{ marginTop: 10 }}>
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>

                <Button style={{ marginTop: 12 }} onClick={assign}>
                    Assign Beat
                </Button>
            </Card>
        </div>
    );
}

/* ================= INSPECTIONS ================= */

function InspectionList() {
    const [list, setList] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const load = async () => {
        const r = await SweepingApi.qcInspections();
        setList(r.inspections || []);
    };

    useEffect(() => {
        load();
    }, []);

    if (selectedId) {
        return <InspectionDetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
    }

    return (
        <div style={{ marginTop: 20 }}>
            {list.map(i => (
                <div key={i.id} style={{ marginBottom: 12 }}>
                    <Card >

                        <b>{i.sweepingBeat?.geoNodeBeat?.name}</b>

                        <div style={{ color: "#6b7280" }}>
                            Employee: {i.employee?.name}
                        </div>

                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                            {new Date(i.createdAt).toLocaleString()}
                        </div>

                        <div style={{
                            marginTop: 6,
                            background: STATUS_COLOR[i.status],
                            padding: "4px 10px",
                            borderRadius: 10,
                            display: "inline-block"
                        }}>
                            {i.status.replace("_", " ")}
                        </div>

                        <Button style={{ marginTop: 10 }} onClick={() => setSelectedId(i.id)}>
                            View Details
                        </Button>

                    </Card>
                </div>
            ))}
        </div>
    );
}

/* ================= DETAIL ================= */

function InspectionDetail({ id, onBack }: any) {
    const [inspection, setInspection] = useState<any>(null);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        SweepingApi.qcInspections().then(r => {
            const found = r.inspections.find((i: any) => i.id === id);
            setInspection(found);
        });
    }, [id]);


    if (!inspection) return <p>Loading…</p>;

    const getLabel = (code: string) =>
        SWEEPING_QUESTIONS.find(q => q.code === code)?.label || code;

    const getHindi = (code: string) =>
        SWEEPING_QUESTIONS.find(q => q.code === code)?.hi || "";

    const decide = async (decision: any) => {
        if (inspection.status === "APPROVED" || inspection.status === "REJECTED")
            return alert("Already closed");

        if (!confirm(`Confirm ${decision.replace("_", " ")}?`)) return;

        setActing(true);
        await SweepingApi.qcDecision(id, decision);
        setActing(false);
        onBack();
    };

    return (
        <Card>

            <Button onClick={onBack}>← Back</Button>

            <h3>Inspection Review</h3>

            <div style={{
                background: STATUS_COLOR[inspection.status],
                padding: "4px 10px",
                borderRadius: 10,
                display: "inline-block"
            }}>
                {inspection.status.replace("_", " ")}
            </div>

            <p><b>Beat:</b> {inspection.sweepingBeat?.geoNodeBeat?.name}</p>
            <p><b>Employee:</b> {inspection.employee?.name}</p>

            <h4>Inspection Answers</h4>

            {inspection.answers.map((a: any) => (
                <div key={a.id} style={{ background: "#fff", padding: 12, borderRadius: 10, marginTop: 8 }}>
                    <b>{getLabel(a.questionCode)}</b>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{getHindi(a.questionCode)}</div>

                    <div style={{ marginTop: 4 }}>
                        {typeof a.answer === "boolean" ? (a.answer ? "Yes" : "No") : a.answer}
                    </div>
                </div>
            ))}

            <h4 style={{ marginTop: 16 }}>Photo Evidence</h4>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {inspection.photos.map((p: any) => (
                    <img
                        key={p.id}
                        src={p.photoUrl}
                        style={{ width: 100, height: 100, borderRadius: 8, objectFit: "cover" }}
                    />
                ))}
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <Button disabled={acting} onClick={() => decide("APPROVED")}>Approve</Button>
                <Button disabled={acting} onClick={() => decide("REJECTED")}>Reject</Button>
                <Button disabled={acting} onClick={() => decide("ACTION_REQUIRED")}>
                    Action Required
                </Button>
            </div>

        </Card>
    );
}
