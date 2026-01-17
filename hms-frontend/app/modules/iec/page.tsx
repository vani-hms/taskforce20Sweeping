import { ModuleGuard } from "@components/Guards";

export default function IecModulePage() {
  return (
    <ModuleGuard module="IEC" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>IEC Module Dashboard</h2>
        <p>Content distribution, campaigns, and QC verification tasks.</p>
      </div>
    </ModuleGuard>
  );
}
