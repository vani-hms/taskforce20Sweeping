'use client';

import Link from "next/link";
import { Protected } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";

function labelForModule(name?: string, key?: string) {
  const value = name || key || "";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ModulesLanding() {
  const { user } = useAuth();
  const modules = user?.modules || [];
  const hasQc = user?.roles?.includes("QC");

  return (
    <Protected>
      <div className="page">
        <h1>Modules</h1>
        {modules.length === 0 ? (
          <div className="card">
            <p className="muted">You are not assigned to any modules yet.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {modules.map((m) => (
              <div className="card card-hover" key={m.key}>
                <h3>{labelForModule(m.name, m.key)}</h3>
                <p className="muted">Access records and tasks for this module.</p>
                <Link className="btn btn-primary btn-sm" href={`/modules/${m.key.toLowerCase()}`}>
                  Open
                </Link>
              </div>
            ))}
            {hasQc && (
              <div className="card card-hover">
                <h3>Employees</h3>
                <p className="muted">View employees assigned to your modules.</p>
                <Link className="btn btn-secondary btn-sm" href="/employees">
                  View
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </Protected>
  );
}
