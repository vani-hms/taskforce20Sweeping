'use client';

import { useEffect, useState } from "react";
import { TaskforceApi, ApiError } from "@lib/apiClient";

type Case = {
    id: string;
    title: string;
    status: string;
    assignedTo?: string;
    geoNodeId?: string;
    activities?: any[];
};

export default function EmployeeDashboard() {
    const [cases, setCases] = useState<Case[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // Stats
    const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [title, setTitle] = useState("");
    const [geoNodeId, setGeoNodeId] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [createStatus, setCreateStatus] = useState("");
    const [saving, setSaving] = useState(false);

    // Activities & Updates
    const [activityByCase, setActivityByCase] = useState<Record<string, string>>({});
    const [assigneeByCase, setAssigneeByCase] = useState<Record<string, string>>({});
    const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);

    const loadCases = async () => {
        try {
            setLoading(true);
            const data = await TaskforceApi.listCases();
            const list = data.cases || [];
            setCases(list);

            // Calculate stats
            setStats({
                total: list.length,
                pending: list.filter((c: Case) => c.status === 'OPEN').length,
                active: list.filter((c: Case) => c.status === 'IN_PROGRESS').length
            });

            setError("");
        } catch (err: any) {
            if (err.status === 401 || err.status === 403) {
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
            setCreateStatus("");
            setTitle("");
            setGeoNodeId("");
            setAssignedTo("");
            setIsCreating(false);
            await loadCases();
        } catch (err: any) {
            const msg = err.message || "Failed to create";
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
            // Update stats locally or reload?
            // Simple reload to be safe or local update:
            // We will just reload for data consistency
            await loadCases();
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
        <div className="page">
            {/* Hero Section */}
            <div className="module-hero">
                <div>
                    <p className="eyebrow">Module · Taskforce</p>
                    <h1>Operations Dashboard</h1>
                    <p className="muted" style={{ maxWidth: '600px' }}>
                        Manage city-scoped cases, track progress, and assign tasks to action officers.
                    </p>

                    <div className="hero-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsCreating(!isCreating)}
                        >
                            {isCreating ? "Cancel" : "+ Create New Task"}
                        </button>
                        <button className="btn btn-secondary" onClick={loadCases}>
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="metric-strip">
                    <div className="metric-pill">
                        <span className="label">Total Cases</span>
                        <span className="value">{stats.total}</span>
                    </div>
                    <div className="metric-pill">
                        <span className="label">Open / Pending</span>
                        <span className="value" style={{ color: 'var(--warning)' }}>{stats.pending}</span>
                    </div>
                    <div className="metric-pill">
                        <span className="label">In Progress</span>
                        <span className="value" style={{ color: 'var(--accent)' }}>{stats.active}</span>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Create Form (Expandable) */}
            {isCreating && (
                <div className="card animate-fade-in" style={{ animation: 'fade-in 0.2s ease' }}>
                    <div className="card-header">
                        <h3 className="card-title">Create New Task</h3>
                        <button className="btn btn-sm btn-ghost" onClick={() => setIsCreating(false)}>✕</button>
                    </div>
                    <form onSubmit={createCase} className="form-grid">
                        <div className="form-field">
                            <label>Task Title</label>
                            <input
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Brief description of the issue"
                            />
                        </div>

                        <div className="form-field">
                            <label>Geo Node ID (Optional)</label>
                            <input
                                className="input"
                                value={geoNodeId}
                                onChange={(e) => setGeoNodeId(e.target.value)}
                                placeholder="e.g. NODE-123"
                            />
                        </div>

                        <div className="form-field">
                            <label>Assign To (User ID)</label>
                            <input
                                className="input"
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                placeholder="Officer ID"
                            />
                        </div>

                        <div className="form-field" style={{ justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-primary"
                                type="submit"
                                disabled={saving}
                                style={{ marginTop: 'auto' }}
                            >
                                {saving ? "Saving..." : "Create Task"}
                            </button>
                        </div>
                    </form>
                    {createStatus && <div className="muted mt-2">{createStatus}</div>}
                </div>
            )}

            {/* Tasks Table Panel */}
            <div className="table-panel">
                <div className="card-header p-4 border-b border-border">
                    <h2 className="card-title">All Tasks</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center muted">Loading tasks...</div>
                ) : cases.length === 0 ? (
                    <div className="p-8 text-center muted">No tasks found. Create one to get started.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Task / ID</th>
                                    <th>Status</th>
                                    <th>Assignee</th>
                                    <th>Geo Node</th>
                                    <th>Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="font-semibold">{c.title}</div>
                                            <div className="text-xs muted font-mono mt-1">{c.id.slice(0, 8)}...</div>
                                        </td>
                                        <td>
                                            <select
                                                className={`input text-sm py-1 px-2 border-transparent bg-transparent hover:bg-white hover:border-gray-200 cursor-pointer font-bold ${c.status === 'COMPLETED' ? 'text-green-600' :
                                                        c.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-yellow-600'
                                                    }`}
                                                value={c.status}
                                                disabled={updatingCaseId === c.id}
                                                onChange={(e) => updateStatus(c.id, e.target.value, c.assignedTo)}
                                            >
                                                <option value="OPEN">OPEN</option>
                                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                                <option value="COMPLETED">COMPLETED</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={c.assignedTo ? "text-sm" : "muted text-sm italic"}>
                                                    {c.assignedTo || "Unassigned"}
                                                </span>
                                                <button
                                                    className="text-xs text-blue-600 hover:underline"
                                                    onClick={() => {
                                                        const newAssignee = prompt("Enter new assignee User ID:", c.assignedTo || "");
                                                        if (newAssignee !== null) updateStatus(c.id, c.status, newAssignee);
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </td>
                                        <td className="text-sm muted">{c.geoNodeId || "—"}</td>
                                        <td className="w-[300px]">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        className="input text-xs flex-1 py-1"
                                                        placeholder="Add note..."
                                                        value={activityByCase[c.id] || ""}
                                                        onChange={(e) => setActivityByCase((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && addActivity(c.id)}
                                                    />
                                                    <button
                                                        className="btn btn-sm btn-secondary py-0 px-2 h-[30px]"
                                                        onClick={() => addActivity(c.id)}
                                                        disabled={!activityByCase[c.id]}
                                                    >
                                                        Add
                                                    </button>
                                                </div>

                                                {c.activities && c.activities.length > 0 && (
                                                    <details className="group">
                                                        <summary className="text-xs muted cursor-pointer hover:text-blue-600 list-none flex items-center gap-1">
                                                            <span>Show {c.activities.length} activities</span>
                                                            <span className="transition-transform group-open:rotate-180">▾</span>
                                                        </summary>
                                                        <ul className="mt-2 text-xs text-gray-600 space-y-1 bg-slate-50 p-2 rounded">
                                                            {c.activities.map((a: any, i: number) => (
                                                                <li key={i} className="border-b border-gray-100 last:border-0 pb-1">
                                                                    <strong>{a.action}</strong>: {a.metadata?.note || "Update"}
                                                                    <div className="text-[10px] muted">{new Date(a.createdAt).toLocaleString()}</div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
