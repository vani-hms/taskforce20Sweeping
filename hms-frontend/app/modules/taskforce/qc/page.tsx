'use client';

import { ModuleGuard, Protected } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import TaskforceQCDashboard from "../components/QCDashboard";

export default function TaskforceQcHomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 muted">Checking access...</div>;
  }

  if (user?.roles?.includes("ACTION_OFFICER")) {
    return (
      <div className="card">
        <h3>Unauthorized for this module</h3>
        <p className="muted">Action Officer access is not allowed on QC workspaces.</p>
      </div>
    );
  }

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["QC", "CITY_ADMIN", "ULB_OFFICER", "COMMISSIONER"]}>
        <TaskforceQCDashboard />
      </ModuleGuard>
    </Protected>
  );
}
