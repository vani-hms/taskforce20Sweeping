'use client';

import { ModuleGuard, Protected } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import QCDashboard from "../components/QCDashboard";

export default function LitterbinsQcPage() {
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
      <ModuleGuard module="LITTERBINS" roles={["QC", "CITY_ADMIN", "ULB_OFFICER"]}>
        <QCDashboard />
      </ModuleGuard>
    </Protected>
  );
}
