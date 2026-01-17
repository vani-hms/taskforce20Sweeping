import { ModuleGuard } from "@components/Guards";

export default function Module8Page() {
  return (
    <ModuleGuard module="MODULE8" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 8 Dashboard</h2>
        <p>Placeholder for Module 8 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
