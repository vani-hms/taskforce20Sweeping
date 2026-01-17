import { RoleGuard } from "@components/Guards";

export default function ActionOfficerPage() {
  return (
    <RoleGuard roles={["ACTION_OFFICER", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h2>Action Officer Tasks</h2>
        <p>Assigned tasks with status update actions only.</p>
        <ul>
          <li>View assigned tasks (API: GET /municipal/tasks?assignedTo=me)</li>
          <li>Update status (in-progress, completed, escalated)</li>
          <li>Module-specific links (Taskforce, IEC, etc.)</li>
        </ul>
      </div>
    </RoleGuard>
  );
}
