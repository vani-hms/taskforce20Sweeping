'use client';

import { useEffect, useMemo, useState } from "react";
import { CityUserApi } from "@lib/apiClient";
import type { Role } from "../../../types/auth";

type CityUser = { id: string; name: string; email: string; role: Role; createdAt: string };

const allowedRoles: Role[] = ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"];

export default function CityUsersPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<CityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { name: string; role: Role; moduleId: string; canWrite: boolean }>>({});

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users]
  );

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await CityUserApi.list();
      setUsers(data.users as CityUser[]);
      const editState: Record<string, { name: string; role: Role; moduleId: string; canWrite: boolean }> = {};
      data.users.forEach((u) => {
        editState[u.id] = { name: u.name, role: u.role as Role, moduleId: "", canWrite: false };
      });
      setEditing(editState);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    setError("");
    try {
      await CityUserApi.create({
        email,
        name,
        password,
        role,
        moduleId: moduleId || undefined,
        canWrite
      });
      setStatus("User created");
      setEmail("");
      setName("");
      setPassword("");
      setModuleId("");
      setCanWrite(false);
      await loadUsers();
    } catch (err: any) {
      setStatus("");
      setError(err?.message || "Failed to create user");
    }
  };

  const updateUser = async (id: string) => {
    const payload = editing[id];
    if (!payload) return;
    setSavingUserId(id);
    setError("");
    try {
      await CityUserApi.update(id, {
        name: payload.name,
        role: payload.role,
        moduleId: payload.moduleId || undefined,
        canWrite: payload.canWrite
      });
      setStatus("User updated");
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to update user");
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user from the city?")) return;
    setSavingUserId(id);
    setError("");
    try {
      await CityUserApi.remove(id);
      setStatus("User deleted");
      await loadUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete user");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2>User Management</h2>
        <p className="muted">Creates municipal users for the active city. CityId is taken from your token.</p>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-2">
          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="field">
            <label>Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Module ID (optional for module-scoped roles)</label>
            <input
              className="input"
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              placeholder="Module UUID if assigning module role"
            />
          </div>
          <div className="field flex items-center gap-2">
            <input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} />
            <label>Allow write access for module role</label>
          </div>
          <div className="md:col-span-2 flex gap-3 items-center">
            <button className="btn btn-primary" type="submit" disabled={!email || !name || !password}>
              Create User
            </button>
            {status && <span className="text-sm text-green-700">{status}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-lg font-semibold">Users in this city</h3>
            <p className="muted">Edit or remove municipal users assigned to your city.</p>
          </div>
          {loading && <span className="muted">Loading…</span>}
        </div>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {!loading && sortedUsers.length === 0 && <div className="muted">No users found for this city.</div>}
        {!loading && sortedUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Module ID</th>
                  <th>Can Write</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => {
                  const edit = editing[u.id] || { name: u.name, role: u.role, moduleId: "", canWrite: false };
                  return (
                    <tr key={u.id}>
                      <td>
                        <input
                          className="input"
                          value={edit.name}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [u.id]: { ...edit, name: e.target.value } }))
                          }
                        />
                      </td>
                      <td className="text-sm text-slate-600">{u.email}</td>
                      <td>
                        <select
                          className="input"
                          value={edit.role}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [u.id]: { ...edit, role: e.target.value as Role } }))
                          }
                        >
                          {allowedRoles.map((r) => (
                            <option key={r} value={r}>
                              {r.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="input"
                          placeholder="Module UUID"
                          value={edit.moduleId}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [u.id]: { ...edit, moduleId: e.target.value } }))
                          }
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={edit.canWrite}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [u.id]: { ...edit, canWrite: e.target.checked } }))
                          }
                        />
                      </td>
                      <td className="flex gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => updateUser(u.id)}
                          disabled={savingUserId === u.id}
                        >
                          {savingUserId === u.id ? "Saving…" : "Save"}
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteUser(u.id)}
                          disabled={savingUserId === u.id}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
