import { ModuleGuard } from "@components/Guards";

export default function Module6Page() {
  return (
    <ModuleGuard module="MODULE6" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 6 Dashboard</h2>
        <p>Placeholder for Module 6 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
