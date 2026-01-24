import { RoleGuard } from "@components/Guards";

export default function CommissionerDashboard() {
  return (
    <RoleGuard roles={["COMMISSIONER", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Commissioner Dashboard</h2>
        <p>Read-only city-wide and module-wise reports.</p>
        <ul>
          <li>City performance metrics</li>
          <li>Module KPIs (Taskforce, Toilet, etc.)</li>
          <li>Download/export reports</li>
        </ul>
      </div>
    </RoleGuard>
  );
}
