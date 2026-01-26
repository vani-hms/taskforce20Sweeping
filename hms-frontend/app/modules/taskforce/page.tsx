import { ModuleGuard } from "@components/Guards";
import Link from "next/link";

export default function TaskforceModulePage() {
  return (
    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE"]}>
      <div className="page">
        <h1>Taskforce</h1>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          <div className="card">
            <h3>Assigned Feeder Points</h3>
            <p className="muted">View feeder points assigned to you and submit daily reports within 100m.</p>
            <Link className="btn btn-primary btn-sm" href="/modules/taskforce/assigned">
              View Assigned Feeders
            </Link>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
