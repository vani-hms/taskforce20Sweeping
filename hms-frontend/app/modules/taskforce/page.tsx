import { ModuleGuard } from "@components/Guards";
import Link from "next/link";

export default function TaskforceModulePage() {
  return (

    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Taskforce Module</h2>
        <p>Manage and track city-scoped cases with activities and assignments.</p>
        <div style={{ display: "grid", gap: 8 }}>
          <Link className="btn btn-primary" href="/modules/taskforce/tasks">
            Go to Tasks
          </Link>

        </div>
      </div>
    </ModuleGuard>
  );
}
