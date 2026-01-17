import { ModuleGuard } from "@components/Guards";

export default function TaskforceModulePage() {
  return (
    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Taskforce Dashboard</h2>
        <p>Module-specific KPIs, tasks, and QC queues.</p>
        <ul>
          <li>My tasks (employee)</li>
          <li>QC queue (QC)</li>
          <li>Action Officer updates</li>
          <li>Activity feed per city/module</li>
        </ul>
      </div>
    </ModuleGuard>
  );
}
