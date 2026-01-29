'use client';

import Link from "next/link";
import { Protected } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import { moduleLabel } from "@lib/labels";
import { canonicalizeModules, routeForModule } from "@utils/modules";

export default function ModulesLanding() {
  const { user } = useAuth();
  const deduped = canonicalizeModules(user?.modules || []);
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
            {deduped.map((m) => (
              <div className="card card-hover" key={m.key}>
                <h3>{moduleLabel(m.key, m.name)}</h3>
                <p className="muted">Access records and tasks for this module.</p>
                <Link className="btn btn-primary btn-sm" href={`/modules/${routeForModule(m.key)}`}>
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
