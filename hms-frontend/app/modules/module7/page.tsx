import { ModuleGuard } from "@components/Guards";

export default function Module7Page() {
  return (
    <ModuleGuard module="MODULE7" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Module 7 Dashboard</h2>
        <p>Placeholder for Module 7 workflows.</p>
      </div>
    </ModuleGuard>
  );
}
