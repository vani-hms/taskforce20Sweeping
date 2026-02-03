'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";
import Link from "next/link";

export default function ReportsTab() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");

  useEffect(() => {
    load();
  }, [dateFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const s: any = await SweepingApi.getMyStats(dateFilter);
      const r: any = await SweepingApi.listMyInspections();
      setStats(s);
      setReports(r.inspections || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="skeleton h-40 rounded-xl" />;

  return (
    <div className="space-y-6">

      {/* FILTER */}
      <div className="tab-bar">
        {["today", "week", "month"].map(f => (
          <button
            key={f}
            className={`tab ${dateFilter === f ? "active" : ""}`}
            onClick={() => setDateFilter(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* KPI */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16
          }}
        >

          <Kpi color="blue" label="Submitted" value={stats.submitted} />
          <Kpi color="green" label="Approved" value={stats.approved} />
          <Kpi color="red" label="Rejected" value={stats.rejected} />
          <Kpi color="orange" label="Action Required" value={stats.actionRequired} />

        </div>
      )}

      {/* TABLE */}
      <div className="card">

        <div className="flex-between mb-3">
          <b>📄 Recent Inspections</b>

          <Link
            href="/modules/sweeping/inspections"
            className="link text-sm"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">

          <table className="table">

            <thead>
              <tr>
                <th>Beat</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {reports.map(r => (
                <tr key={r.id}>

                  <td className="font-semibold">
                    {r.sweepingBeat?.geoNodeBeat?.name}
                  </td>

                  <td>
                    <Status status={r.status} />
                  </td>

                  <td className="text-xs muted">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>

                  <td>
                    <Link
                      href={`/modules/sweeping/inspection/${r.id}`}
                      target="_blank"
                      className="btn btn-sm btn-secondary"
                    >
                      View
                    </Link>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

/* KPI MINI */
function Kpi({ label, value, color }: any) {
  return (
    <div className={`kpi ${color}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

/* STATUS */
function Status({ status }: any) {
  const map: any = {
    APPROVED: "badge-success",
    REJECTED: "badge-error",
    SUBMITTED: "badge",
    ACTION_REQUIRED: "badge-warn"
  };

  return (
    <span className={map[status]}>
      {status}
    </span>
  );
}
