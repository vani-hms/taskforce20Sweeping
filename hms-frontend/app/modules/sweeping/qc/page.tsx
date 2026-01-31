'use client';

import { useEffect, useState } from "react";
import { SweepingApi, EmployeesApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";

export default function QcSweepingPage() {
    const [tab, setTab] = useState<"assign" | "inspect">("assign");

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["QC"]}>
                <div style={{ padding: 24 }}>
                    <h2>Sweeping QC</h2>

                    <div style={{ marginTop: 16 }}>
                        <Button onClick={() => setTab("assign")}>Beat Assignment</Button>
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

/* ---------------- ASSIGN ---------------- */

function BeatAssignment() {
    const [beats, setBeats] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [beatId, setBeatId] = useState("");
    const [empId, setEmpId] = useState("");

    useEffect(() => {
        SweepingApi.qcBeats().then(r => setBeats(r.beats));
        EmployeesApi.list("SWEEPING").then(r => setEmployees(r.employees));
    }, []);

    const assign = async () => {
        if (!beatId || !empId) return alert("Select both");

        await SweepingApi.assignBeat({
            sweepingBeatId: beatId,
            employeeId: empId
        });

        alert("Assigned");
    };

    return (
        <div style={{ marginTop: 20 }}>
            <Card >
                <h3>Assign Beat</h3>

                <select onChange={e => setBeatId(e.target.value)}>
                    <option value="">Select Beat</option>
                    {beats.map(b => (
                        <option key={b.id} value={b.id}>{b.name || b.id}</option>
                    ))}
                </select>

                <select onChange={e => setEmpId(e.target.value)} style={{ marginTop: 12 }}>
                    <option value="">Select Employee</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>

                <Button style={{ marginTop: 12 }} onClick={assign}>
                    Assign
                </Button>
            </Card>
        </div>
    );
}

/* ---------------- INSPECTIONS ---------------- */

function InspectionList() {
    const [list, setList] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);

    useEffect(() => {
        SweepingApi.qcInspections().then(r => setList(r.inspections));
    }, []);

    if (selected) {
        return <InspectionDetail inspection={selected} onBack={() => setSelected(null)} />;
    }

    return (
        <div style={{ marginTop: 20 }}>
            {list.map(i => (
                <div style={{ marginBottom: 12 }}>
                    <Card key={i.id} >
                        <b>{i.employee?.name}</b>
                        <div>Status: {i.status}</div>

                        <Button onClick={() => setSelected(i)} style={{ marginTop: 8 }}>
                            View
                        </Button>
                    </Card>
                </div>
            ))}
        </div>
    );
}

function InspectionDetail({ inspection, onBack }: any) {
    const decide = async (decision: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
        await SweepingApi.qcDecision(inspection.id, decision);
        alert("Updated");
        onBack();
    };

    return (
        <Card>
            <Button onClick={onBack}>← Back</Button>

            <h3>Inspection Detail</h3>

            {inspection.answers?.map((a: any, idx: number) => (
                <div key={idx}>
                    {a.questionCode}: {a.answer ? "YES" : "NO"}
                </div>
            ))}

            <div style={{ marginTop: 12 }}>
                <Button onClick={() => decide("APPROVED")}>Approve</Button>
                <Button onClick={() => decide("REJECTED")} style={{ marginLeft: 8 }}>Reject</Button>
                <Button onClick={() => decide("ACTION_REQUIRED")} style={{ marginLeft: 8 }}>
                    Action Required
                </Button>
            </div>
        </Card>
    );
}
