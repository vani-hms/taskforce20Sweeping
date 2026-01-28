'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Summary = {
  total: number;
  assigned: number;
  pending: number;
  requests: number;
};

type AssignedBin = {
  id: string;
  areaName: string;
  locationName: string;
  status: string;
  distanceMeters?: number;
};

export default function TwinbinEmployeeHome() {
  const [summary, setSummary] = useState<Summary>({ total: 0, assigned: 0, pending: 0, requests: 0 });
  const [assigned, setAssigned] = useState<AssignedBin[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [assignedRes, pendingRes, myReqRes] = await Promise.all([
          TwinbinApi.assigned(),
          TwinbinApi.pending(),
          TwinbinApi.myRequests()
        ]);
        const assignedBins = (assignedRes.bins || []).map((b: any) => ({
          id: b.id,
          areaName: b.areaName,
          locationName: b.locationName,
          status: b.status,
          distanceMeters: b.latestReport?.distanceMeters
        }));
        setAssigned(assignedBins);
        setSummary({
          total: (pendingRes.bins?.length || 0) + (assignedRes.bins?.length || 0),
          assigned: assignedRes.bins?.length || 0,
          pending: pendingRes.bins?.length || 0,
          requests: myReqRes.bins?.length || 0
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
      }
    };
    load();
  }, []);

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE", "CITY_ADMIN", "QC", "ACTION_OFFICER", "HMS_SUPER_ADMIN"]}>
        <div className="page dashboard">
          <Header />
          {error && <div className="alert error">{error}</div>}

          <KpiRow summary={summary} />

          <section className="section">
            <div className="section-head">
              <div>
                <h2>Actions</h2>
                <p className="muted">Register new bins or review your submissions.</p>
              </div>
              <Link className="btn btn-primary" href="/modules/twinbin/register">
                + Register New Bin
              </Link>
            </div>
            <div className="action-grid">
              <ActionCard
                title="Assigned Bins"
                description="Report visits and submit inspections for your assigned bins."
                href="/modules/twinbin/assigned"
                emphasis
              />
              <ActionCard
                title="My Requests"
                description="Track the approval status of bins you registered."
                href="/modules/twinbin/my-requests"
              />
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div>
                <h2>Assigned Work</h2>
                <p className="muted">Primary worklist ordered by urgency.</p>
              </div>
              <Link className="btn btn-secondary" href="/modules/twinbin/assigned">
                View all
              </Link>
            </div>
            {assigned.length === 0 ? (
              <div className="muted card">No assigned bins yet.</div>
            ) : (
              <div className="assigned-grid">
                {assigned.map((b) => (
                  <div key={b.id} className="bin-card">
                    <div className="bin-top">
                      <div>
                        <div className="bin-title">{b.areaName}</div>
                        <div className="muted">{b.locationName || "—"}</div>
                      </div>
                      <StatusChip status={b.status} />
                    </div>
                    <div className="bin-meta">
                      <Badge tone={b.distanceMeters && b.distanceMeters <= 50 ? "success" : "warn"}>
                        {b.distanceMeters ? `${b.distanceMeters.toFixed(1)} m away` : "Distance unavailable"}
                      </Badge>
                    </div>
                    <div className="bin-actions">
                      <Link className="btn btn-primary btn-sm" href={`/modules/twinbin/assigned/${b.id}`}>
                        Open & Report
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <Style />
      </ModuleGuard>
    </Protected>
  );
}

function Header() {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Module · Twinbin</p>
        <h1>Twinbin – City Operations</h1>
        <p className="muted">Monitor, register, and service litter bins across your city.</p>
      </div>
      <div className="badge ghost">Employee Workspace</div>
    </header>
  );
}

function KpiRow({ summary }: { summary: Summary }) {
  const items = [
    { label: "Total bins in scope", value: summary.total },
    { label: "Assigned to you", value: summary.assigned },
    { label: "Pending approvals", value: summary.pending },
    { label: "Your requests", value: summary.requests }
  ];
  return (
    <div className="kpi-row">
      {items.map((k) => (
        <div key={k.label} className="kpi-card">
          <div className="muted">{k.label}</div>
          <div className="kpi-value">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  emphasis
}: {
  title: string;
  description: string;
  href: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`action-card ${emphasis ? "action-primary" : ""}`}>
      <div>
        <h3>{title}</h3>
        <p className="muted">{description}</p>
      </div>
      <Link className={emphasis ? "btn btn-primary" : "btn btn-secondary"} href={href}>
        Open
      </Link>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "APPROVED" ? "success" : status === "PENDING_QC" ? "warn" : status === "REJECTED" ? "danger" : "info";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "success" | "warn" | "danger" | "info" }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

function Style() {
  return (
    <style>
      {`
      .dashboard { max-width: 1100px; margin: 0 auto; }
      .page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
      .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #64748b; margin: 0; }
      .badge { padding: 6px 12px; border-radius: 999px; font-weight: 700; border: 1px solid #e2e8f0; }
      .badge.ghost { background: #f8fafc; color: #0f172a; }
      .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
      .kpi-card { background: #0b1021; color: #e2e8f0; padding: 14px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
      .kpi-value { font-size: 28px; font-weight: 800; margin-top: 4px; }
      .section { margin-top: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.05); }
      .section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
      .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
      .action-card { border: 1px dashed #cbd5e1; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #f8fafc; }
      .action-primary { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: #fff; border: none; box-shadow: 0 12px 30px rgba(37,99,235,0.25); }
      .action-primary p { color: #e2e8f0; }
      .assigned-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
      .bin-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #fff; box-shadow: 0 8px 20px rgba(15,23,42,0.04); display: flex; flex-direction: column; gap: 8px; }
      .bin-top { display: flex; justify-content: space-between; gap: 10px; }
      .bin-title { font-weight: 700; font-size: 16px; color: #0f172a; }
      .bin-meta { display: flex; gap: 8px; align-items: center; }
      .chip { padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; }
      .chip-success { background: #dcfce7; color: #166534; }
      .chip-warn { background: #fef3c7; color: #92400e; }
      .chip-danger { background: #fee2e2; color: #991b1b; }
      .chip-info { background: #e0f2fe; color: #075985; }
      .bin-actions { display: flex; justify-content: flex-end; }
    `}
    </style>
  );
}
