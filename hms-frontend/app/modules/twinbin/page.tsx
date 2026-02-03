'use client';

import { Protected, ModuleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import AdminDashboard from "./components/AdminDashboard";
import QCDashboard from "./components/QCDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";

export default function TwinbinPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isAdmin = roles.includes("CITY_ADMIN") || roles.includes("ULB_OFFICER");
  const isQC = roles.includes("QC");
  const isActionOfficer = roles.includes("ACTION_OFFICER");

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE", "CITY_ADMIN", "HMS_SUPER_ADMIN", "ULB_OFFICER", "QC"]}>
        {isActionOfficer ? (
          <div className="card">
            <h3>Unauthorized for this module</h3>
            <p className="muted">Action Officer access is not allowed on Employee or QC workspaces.</p>
          </div>
        ) : isAdmin ? (
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
