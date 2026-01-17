import { ModuleGuard } from "@components/Guards";

export default function Module5Page() {
  return (
    <ModuleGuard module="MODULE5" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 5 Dashboard</h2>
        <p>Placeholder for Module 5 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
