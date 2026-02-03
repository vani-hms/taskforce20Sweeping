'use client';

import { Protected, ModuleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";

export default function ModuleAdminPage({ params }: { params: { moduleKey: string } }) {
  const { user, loading } = useAuth();
  const moduleKey = params.moduleKey?.toUpperCase();

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
      <ModuleGuard module={moduleKey} roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
        <div className="card">
          <h2>Admin Workspace</h2>
          <p className="muted">Module: {moduleKey}</p>
          <p className="muted">Admin view is not configured for this module yet.</p>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
