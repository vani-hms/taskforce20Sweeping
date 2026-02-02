'use client';

import { Protected, ModuleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import AdminDashboard from "../../twinbin/components/AdminDashboard";

export default function LitterbinsAdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6 muted">Checking access...</div>;
  }

  if (user?.roles?.includes("ACTION_OFFICER")) {
    return (
      <div className="card">
        <h3>Unauthorized for this module</h3>
        <p className="muted">Action Officer access is not allowed on Admin workspaces.</p>
      </div>
    );
  }

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "ULB_OFFICER"]}>
        <AdminDashboard />
      </ModuleGuard>
    </Protected>
  );
}
