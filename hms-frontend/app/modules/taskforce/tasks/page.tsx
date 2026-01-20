'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { TaskforceApi, ApiError } from "@lib/apiClient";

type Case = {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  geoNodeId?: string;
  activities?: any[];
};

export default function TaskforceTasksPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [geoNodeId, setGeoNodeId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [activityByCase, setActivityByCase] = useState<Record<string, string>>({});
  const [assigneeByCase, setAssigneeByCase] = useState<Record<string, string>>({});
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await TaskforceApi.listCases();
      setCases(data.cases || []);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Not authorized for Taskforce in this city.");
      } else {
        setError("Failed to load tasks.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const createCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateStatus("Saving...");
    try {
      await TaskforceApi.createCase({
        title,
        geoNodeId: geoNodeId || undefined,
        assignedTo: assignedTo || undefined
      });
      setCreateStatus("Created task");
      setTitle("");
      setGeoNodeId("");
      setAssignedTo("");
      await loadCases();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setCreateStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string, newAssignee?: string) => {
    try {
      setUpdatingCaseId(id);
      await TaskforceApi.updateCase(id, { status, assignedTo: newAssignee || undefined });
      setCases((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, assignedTo: newAssignee || c.assignedTo } : c))
      );
    } catch (err) {
      setError("Failed to update status or assignee.");
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const addActivity = async (id: string) => {
    const note = activityByCase[id];
    if (!note) return;
    try {
      await TaskforceApi.addActivity(id, { action: "NOTE", metadata: { note } });
      setActivityByCase((prev) => ({ ...prev, [id]: "" }));
      await loadCases();
    } catch (err) {
      setError("Failed to add activity.");
    }
  };

  return (
    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "ACTION_OFFICER", "QC", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="grid grid-2">
        <div className="card">
          <h3>Create Task</h3>
          <form onSubmit={createCase} className="form">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label>Geo Node ID (optional)</label>
            <input className="input" value={geoNodeId} onChange={(e) => setGeoNodeId(e.target.value)} />
            <label>Assign To (User ID, optional)</label>
            <input className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            <button className="btn btn-primary" type="submit">
              {saving ? "Saving..." : "Create"}
            </button>
            {createStatus && <div className="muted">{createStatus}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Tasks</h3>
          {loading && <p>Loading...</p>}
          {error && <p className="alert error">{error}</p>}
          {!loading && !cases.length && !error && <p>No tasks.</p>}
          <div className="table">
            <div className="table-head">
              <div>Title</div>
              <div>Status</div>
              <div>Assignee</div>
              <div>Geo</div>
              <div>Actions</div>
            </div>
            {cases.map((c) => (
              <div className="table-row" key={c.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.id}
                  </div>
                </div>
                <div>{c.status}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div>{c.assignedTo || "—"}</div>
                  <input
                    className="input"
                    placeholder="New assignee userId"
                    value={assigneeByCase[c.id] || ""}
                    onChange={(e) => setAssigneeByCase((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={updatingCaseId === c.id}
                    onClick={() => updateStatus(c.id, c.status, assigneeByCase[c.id])}
                  >
                    {updatingCaseId === c.id ? "Updating..." : "Update assignee"}
                  </button>
                </div>
                <div>{c.geoNodeId || "—"}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  <select
                    className="input"
                    value={c.status}
                    disabled={updatingCaseId === c.id}
                    onChange={(e) => updateStatus(c.id, e.target.value, c.assignedTo)}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                  <textarea
                    className="input"
                    placeholder="Add activity note"
                    value={activityByCase[c.id] || ""}
                    onChange={(e) => setActivityByCase((prev) => ({ ...prev, [c.id]: e.target.value }))}
                  />
                  <button className="btn" type="button" onClick={() => addActivity(c.id)}>
                    Add activity
                  </button>
                  {c.activities && c.activities.length > 0 && (
                    <details>
                      <summary>Activity ({c.activities.length})</summary>
                      <ul>
                        {c.activities.map((a: any) => (
                          <li key={a.id}>
                            <strong>{a.action}</strong> by {a.actorId} • {a.createdAt}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
