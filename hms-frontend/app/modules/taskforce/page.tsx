"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleGuard, Protected } from "@components/Guards";
import Link from "next/link";
import { useAuth } from "@hooks/useAuth";

export default function TaskforceModulePage() {
  const { user } = useAuth();
  const router = useRouter();
  // Safe check for roles to avoid runtime crash if user/roles undefined (though useAuth usually handles null user)
  const isQc = user?.roles ? user.roles.includes("QC") : false;

  useEffect(() => {
    if (isQc) {
      router.replace("/modules/taskforce/qc");
    }
  }, [isQc, router]);

  if (isQc) {
    return <div className="p-8 text-center text-gray-500">Redirecting to QC Dashboard...</div>;
  }

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
        <div className="card">
          <h2>Taskforce Module</h2>
          <p>Manage and track city-scoped cases with activities and assignments.</p>

          <div style={{ display: "grid", gap: 8 }}>
            <Link className="btn btn-primary" href="/modules/taskforce/tasks">
              Go to Tasks
            </Link>
          </div>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
