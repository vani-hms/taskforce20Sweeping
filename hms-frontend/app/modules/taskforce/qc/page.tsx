import { ModuleGuard } from "@components/Guards";

export default function TaskforceQcPage() {
  return (
    <ModuleGuard module="TASKFORCE" roles={["QC", "HMS_SUPER_ADMIN", "CITY_ADMIN"]}>
      <div className="card">
        <h3>QC Verification</h3>
        <p>Review and verify completed tasks.</p>
        <ul>
          <li>GET /modules/taskforce/qc-queue</li>
          <li>POST /modules/taskforce/tasks/:id/verify</li>
        </ul>
      </div>
    </ModuleGuard>
  );
}
