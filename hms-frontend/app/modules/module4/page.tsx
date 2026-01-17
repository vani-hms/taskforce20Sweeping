import { ModuleGuard } from "@components/Guards";

export default function Module4Page() {
  return (
    <ModuleGuard module="MODULE4" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 4 Dashboard</h2>
        <p>Placeholder for Module 4 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
