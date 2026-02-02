"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleGuard, Protected } from "@components/Guards";
import Link from "next/link";
import { useAuth } from "@hooks/useAuth";
import { getPostLoginRedirect } from "@utils/modules";

export default function TaskforceModulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Safe check for roles to avoid runtime crash if user/roles undefined (though useAuth usually handles null user)
  const isQc = user?.roles ? user.roles.includes("QC") : false;
  const isActionOfficer = user?.roles ? user.roles.includes("ACTION_OFFICER") : false;

  useEffect(() => {
    if (loading || !user) return;
    if (isQc) {
      router.replace(getPostLoginRedirect(user));
    }
  }, [loading, isQc, user, router]);

  if (isActionOfficer) {
    return (
      <div className="card">
        <h3>Unauthorized for this module</h3>
        <p className="muted">Action Officer access is not allowed on Employee workspaces.</p>
      </div>
    );
  }

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
