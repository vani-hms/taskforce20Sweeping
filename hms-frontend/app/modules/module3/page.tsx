import { ModuleGuard } from "@components/Guards";

export default function Module3Page() {
  return (
    <ModuleGuard module="MODULE3" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 3 Dashboard</h2>
        <p>Placeholder for Module 3 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
