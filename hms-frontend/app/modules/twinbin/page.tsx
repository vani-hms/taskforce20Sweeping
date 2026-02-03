'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import AdminDashboard from "./components/AdminDashboard";
import QCDashboard from "./components/QCDashboard";

export default function TwinbinPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isAdmin = roles.includes("CITY_ADMIN") || roles.includes("ULB_OFFICER");
  const isQC = roles.includes("QC") || roles.includes("ACTION_OFFICER");

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE", "CITY_ADMIN", "ACTION_OFFICER", "HMS_SUPER_ADMIN", "ULB_OFFICER", "QC"]}>
        {isAdmin ? (
          <AdminDashboard />
        ) : isQC ? (
          <QCDashboard />
        ) : (
          <EmployeeDashboard />
        )}
      </ModuleGuard>
    </Protected>
  );
}

type Summary = {
  total: number;
  assigned: number;
  requests: number;
};

type AssignedBin = {
  id: string;
  areaName: string;
  locationName: string;
  status: string;
  distanceMeters?: number;
};

function EmployeeDashboard() {
  const [summary, setSummary] = useState<Summary>({ total: 0, assigned: 0, requests: 0 });
  const [assigned, setAssigned] = useState<AssignedBin[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [assignedRes, myReqRes] = await Promise.all([TwinbinApi.assigned(), TwinbinApi.myRequests()]);
        const assignedBins = (assignedRes.bins || []).map((b: any) => ({
          id: b.id,
          areaName: b.areaName,
          locationName: b.locationName,
          status: b.status,
          distanceMeters: b.latestReport?.distanceMeters
        }));
        setAssigned(assignedBins);
        setSummary({
          total: (assignedRes.bins?.length || 0) + (myReqRes.bins?.length || 0),
          assigned: assignedRes.bins?.length || 0,
          requests: myReqRes.bins?.length || 0
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
      }
    };
    load();
  }, []);

  return (
    <div className="content">
      <header className="flex justify-between items-center mb-6">
        <div>
          <p className="eyebrow">Module · Litter Bins</p>
          <h1>Employee Workspace</h1>
          <p className="muted">Monitor, register, and service litter bins assigned to you.</p>
        </div>
        <div className="badge badge-info">Employee</div>
      </header>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="grid grid-3 mb-6">
        <KpiCard label="Total in Scope" value={summary.total.toString()} />
        <KpiCard label="Assigned to You" value={summary.assigned.toString()} highlight />
        <KpiCard label="Your Requests" value={summary.requests.toString()} />
      </div>

      <div className="grid gap-6">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Quick Actions</h2>
              <p className="muted text-sm">Register new bins or review your submissions.</p>
            </div>
            <Link className="btn btn-primary" href="/modules/twinbin/register">
              + Register New Bin
            </Link>
          </div>

          <div className="grid grid-2">
            <ActionCard
              title="Assigned Bins"
              desc="Report visits and submit inspections."
              href="/modules/twinbin/assigned"
              primary
            />
            <ActionCard
              title="My Requests"
              desc="Track approval status of registered bins."
              href="/modules/twinbin/my-requests"
            />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2>Assigned Work</h2>
            <Link className="btn btn-sm btn-ghost" href="/modules/twinbin/assigned">
              View All ›
            </Link>
          </div>

          {assigned.length === 0 ? (
            <div className="card muted p-6 text-center">No assigned bins pending.</div>
          ) : (
            <div className="grid grid-2">
              {assigned.map((b) => (
                <div key={b.id} className="card card-hover flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg">{b.areaName}</div>
                      <div className="muted text-sm">{b.locationName || "—"}</div>
                    </div>
                    <Badge status={b.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`badge ${b.distanceMeters && b.distanceMeters <= 50 ? 'badge-success' : 'badge-warn'}`}>
                      {b.distanceMeters ? `${b.distanceMeters.toFixed(1)}m away` : "Distance N/A"}
                    </span>
                  </div>

                  <div className="flex justify-end mt-2">
                    <Link className="btn btn-sm btn-primary" href={`/modules/twinbin/assigned/${b.id}`}>
                      Open & Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? 'border-primary' : ''}`}>
      <div className="muted text-sm uppercase tracking-wider">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  );
}

function ActionCard({ title, desc, href, primary }: any) {
  return (
    <Link href={href} className={`card card-hover flex justify-between items-center p-4 ${primary ? 'bg-primary-soft border-primary-soft' : ''}`}>
      <div>
        <h3 className={primary ? 'text-primary-strong' : ''}>{title}</h3>
        <p className="muted text-sm mb-0">{desc}</p>
      </div>
      <div className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-secondary'}`}>Open</div>
    </Link>
  );
}

function Badge({ status }: { status: string }) {
  let style = "badge-info";
  if (status === "APPROVED") style = "badge-success";
  if (status === "PENDING_QC") style = "badge-warn";
  if (status === "REJECTED") style = "badge-error";

  return <span className={`badge ${style}`}>{status.replace(/_/g, " ")}</span>;
}
// Removed inline Style component
