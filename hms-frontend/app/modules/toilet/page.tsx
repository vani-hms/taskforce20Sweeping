import { ModuleGuard } from "@components/Guards";

export default function ToiletModulePage() {
  return (
    <ModuleGuard module="TOILET" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Toilet Module Dashboard</h2>
        <p>Toilet inspection, reporting, and verification tasks.</p>
      </div>
    </ModuleGuard>
  );
}
