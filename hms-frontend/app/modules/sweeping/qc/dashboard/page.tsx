"use client";

import { useEffect, useState } from "react";
import { SweepingApi, EmployeesApi } from "@lib/apiClient";
import { Protected, ModuleGuard } from "@components/Guards";
import Link from "next/link";

export default function QcDashboard() {
  const [summary, setSummary] = useState<any>({});
  const [qcLoad, setQcLoad] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [wards, setWards] = useState<any>({});
  const [beats, setBeats] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [beatId, setBeatId] = useState("");
  const [empId, setEmpId] = useState("");

 useEffect(() => {
  SweepingApi.dashboardSummary().then((r: any) => setSummary(r));
  SweepingApi.dashboardQcLoad().then((r: any) => setQcLoad(r.qcLoad || []));
  SweepingApi.qcInspections().then((r: any) => setInspections(r.inspections || []));
  SweepingApi.dashboardWardRanking().then((r: any) => setWards(r.wardRanking || {}));
  SweepingApi.qcBeats().then((r: any) => setBeats(r.beats || []));
  EmployeesApi.list("SWEEPING").then((r: any) => setEmployees(r.employees || []));
}, []);

  const pending = inspections.filter(i => i.status === "REVIEW_PENDING");

  const assignBeat = async () => {
    if (!beatId || !empId) return alert("Select beat + employee");
    await SweepingApi.assignBeat({ sweepingBeatId: beatId, employeeId: empId });
    alert("Beat Assigned");
  };

  const decide = async (id: string, d: any) => {
    await SweepingApi.qcDecision(id, d);
    setInspections(list => list.filter(i => i.id !== id));
  };

  return (
    <Protected>
      <ModuleGuard module="SWEEPING" roles={["QC"]}>
        <div className="content page">

          <h1>QC Dashboard</h1>

          {/* KPI */}

          <div className="stats-row">
            <Stat label="Pending Review" value={summary.pendingQc} />
            <Stat label="Action Required" value={summary.actionRequired} />
            <Stat label="Approved Today" value={summary.approvedToday} />
            <Stat label="Total Beats" value={summary.totalBeats} />
          </div>

          {/* Beat Assignment */}

          <div className="card mt-4">
            <h3>Quick Beat Assignment</h3>

            <div className="form-grid mt-2">
              <select className="select" onChange={e => setBeatId(e.target.value)}>
                <option value="">Select Beat</option>
                {beats.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.geoNodeBeat?.name} — {b.assignmentStatus}
                  </option>
                ))}
              </select>

              <select className="select" onChange={e => setEmpId(e.target.value)}>
                <option value="">Select Employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary mt-3" onClick={assignBeat}>
              Assign Beat
            </button>
          </div>

          {/* Pending Inspections */}

          <div className="card mt-4">
            <h3>Pending Inspections</h3>

            <div className="grid grid-3 mt-2">
              {pending.slice(0, 6).map(i => (
                <div key={i.id} className="card">
                  <div className="font-semibold">{i.employee?.name}</div>
                  <div className="text-sm">{i.sweepingBeat?.geoNodeBeat?.name}</div>

                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-sm btn-primary" onClick={() => decide(i.id, "APPROVED")}>
                      Approve
                    </button>

                    <button className="btn btn-sm btn-danger" onClick={() => decide(i.id, "REJECTED")}>
                      Reject
                    </button>

                    <button className="btn btn-sm btn-secondary" onClick={() => decide(i.id, "ACTION_REQUIRED")}>
                      Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QC Workload */}

          <div className="card mt-4">
            <h3>QC Workload</h3>

            {qcLoad.map(q => (
              <div key={q.qcReviewedById} className="mt-2">
                <div className="text-sm">QC: {q.qcReviewedById || "Unassigned"}</div>
                <div style={{ background: "#eef2ff", height: 8, borderRadius: 6 }}>
                  <div
                    style={{
                      width: `${q._count * 10}%`,
                      height: 8,
                      borderRadius: 6,
                      background: "#2563eb"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Ward Leaderboard */}

          <div className="grid grid-3 mt-4">
            {Object.entries(wards).map(([ward, count]: any) => (
              <div key={ward} className="card">
                <div className="muted">Ward</div>
                <div className="text-lg">{count} approved</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Link href="/modules/sweeping/qc">
              <button className="btn btn-secondary">
                Open Full QC Workspace →
              </button>
            </Link>
          </div>

        </div>
      </ModuleGuard>
    </Protected>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="text-lg">{value || 0}</div>
    </div>
  );
}
