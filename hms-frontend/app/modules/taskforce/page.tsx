"use client";

import { ModuleGuard, Protected } from "@components/Guards";
import Link from "next/link";
import { useAuth } from "@hooks/useAuth";

export default function TaskforceModulePage() {
  const { user } = useAuth();
  const isQc = !!user?.roles?.includes("QC");

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
        <div className="card">
          <h2>Taskforce Module</h2>
          <p>Manage and track city-scoped cases with activities and assignments.</p>

          <div style={{ display: "grid", gap: 8 }}>
            <Link className="btn btn-primary" href="/modules/taskforce/tasks">
              Go to Tasks
            </Link>

            {isQc && (
              <>
                <Link className="btn btn-secondary" href="/modules/taskforce/qc/requests">
                  Review Feeder Requests (QC)
                </Link>
                <Link className="btn btn-secondary" href="/modules/taskforce/qc/reports">
                  Review Reports (QC)
                </Link>
              </>
            )}
          </div>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
