'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, CityModulesApi, CityUserApi } from "@lib/apiClient";
import type { Role } from "../../../types/auth";

type CityModule = { id: string; key: string; name: string; enabled?: boolean };
type UserModule = { id: string; key: string; name: string; canWrite: boolean };
type CityUser = { id: string; name: string; email: string; role: Role; createdAt: string; modules: UserModule[] };
type EditableUser = { name: string; role: Role; modules: Record<string, { canWrite: boolean }> };

const allowedRoles: Role[] = ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"];

const normalizeRoleLabel = (r: Role) => r.replace("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
const enforceRoleWriteRules = (role: Role, modules: Record<string, { canWrite: boolean }>) =>
  role === "COMMISSIONER"
    ? Object.fromEntries(Object.keys(modules).map((id) => [id, { canWrite: false }]))
    : modules;
const toModuleMap = (modules: UserModule[] = []) =>
  modules.reduce<Record<string, { canWrite: boolean }>>((acc, m) => {
    acc[m.id] = { canWrite: m.canWrite };
    return acc;
  }, {});
const summarizeModules = (modules: UserModule[]) =>
  modules.length ? modules.map((m) => `${m.name}${m.canWrite ? " (Write)" : " (Read)"}`).join(", ") : "—";

export default function CityUsersPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<CityUser[]>([]);
  const [availableModules, setAvailableModules] = useState<CityModule[]>([]);
  const [newUserModules, setNewUserModules] = useState<Record<string, { canWrite: boolean }>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditableUser>>({});

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users]
  );

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const modules = await CityModulesApi.list();
      const enabledModules = modules.filter((m) => m.enabled !== false);
      setAvailableModules(enabledModules);
    } catch (err: any) {
      setError(err?.message || "Failed to load modules");
    } finally {
      setLoadingModules(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const data = await CityUserApi.list();
      const casted = data.users as CityUser[];
      setUsers(casted);
      const editState: Record<string, EditableUser> = {};
      casted.forEach((u) => {
        editState[u.id] = {
          name: u.name,
          role: u.role,
          modules: toModuleMap(u.modules)
        };
      });
      setEditing(editState);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadModules();
    loadUsers();
  }, []);

  const updateNewModuleSelection = (moduleId: string, checked: boolean) => {
    setNewUserModules((prev) => {
      const next = { ...prev };
      if (checked) next[moduleId] = { canWrite: false };
      else delete next[moduleId];
      return enforceRoleWriteRules(role, next);
    });
  };

  const updateNewModuleWrite = (moduleId: string, canWrite: boolean) => {
    setNewUserModules((prev) => {
      if (!prev[moduleId]) return prev;
      return enforceRoleWriteRules(role, { ...prev, [moduleId]: { canWrite } });
    });
  };

  const changeNewUserRole = (nextRole: Role) => {
    setRole(nextRole);
    setNewUserModules((prev) => enforceRoleWriteRules(nextRole, { ...prev }));
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    setError("");
    try {
      const modules = Object.entries(newUserModules).map(([moduleId, { canWrite }]) => ({ moduleId, canWrite }));
      await CityUserApi.create({
        email,
        name,
        password,
        role,
        modules
      });
      setStatus("User created");
      setEmail("");
      setName("");
      setPassword("");
      setNewUserModules({});
      await loadUsers();
    } catch (err: any) {
      setStatus("");
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to create user");
    }
  };

  const updateEditingRole = (userId: string, nextRole: Role) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      return {
        ...prev,
        [userId]: { ...current, role: nextRole, modules: enforceRoleWriteRules(nextRole, { ...current.modules }) }
      };
    });
  };

  const toggleUserModule = (userId: string, moduleId: string, checked: boolean) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const modules = { ...current.modules };
      if (checked) modules[moduleId] = { canWrite: false };
      else delete modules[moduleId];
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const toggleUserWrite = (userId: string, moduleId: string, canWrite: boolean) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current || !current.modules[moduleId]) return prev;
      const modules = { ...current.modules, [moduleId]: { canWrite } };
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const updateUser = async (id: string) => {
    const payload = editing[id];
    if (!payload) return;
    setSavingUserId(id);
    setError("");
    try {
      const modules = Object.entries(payload.modules).map(([moduleId, { canWrite }]) => ({ moduleId, canWrite }));
      await CityUserApi.update(id, {
        name: payload.name,
        role: payload.role,
        modules
      });
      setStatus("User updated");
      await loadUsers();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to update user");
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
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to delete user");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2>User Management</h2>
        <p className="muted">Assign module access for municipal users. Active city is derived from your token.</p>
        <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2">
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
            <select className="input" value={role} onChange={(e) => changeNewUserRole(e.target.value as Role)}>
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {normalizeRoleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Assign Modules</label>
            {loadingModules ? (
              <div className="skeleton" style={{ height: 32, width: "60%" }} />
            ) : (
              <div className="space-y-2">
                {availableModules.map((m) => {
                  const selected = newUserModules[m.id];
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={(e) => updateNewModuleSelection(m.id, e.target.checked)}
                        />
                        <span>{m.name}</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          disabled={!selected || role === "COMMISSIONER"}
                          checked={selected?.canWrite || false}
                          onChange={(e) => updateNewModuleWrite(m.id, e.target.checked)}
                        />
                        <span>Can write</span>
                      </label>
                    </div>
                  );
                })}
                {!availableModules.length && <p className="muted">No modules enabled for this city.</p>}
              </div>
            )}
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
            <p className="muted">Edit roles and module permissions inline.</p>
          </div>
          {(loadingUsers || loadingModules) && <span className="muted">Loading...</span>}
        </div>
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        {!loadingUsers && sortedUsers.length === 0 && <div className="muted">No users found for this city.</div>}
        {!loadingUsers && sortedUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assigned Modules</th>
                  <th>Edit Assignments</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => {
                  const edit = editing[u.id] || { name: u.name, role: u.role, modules: {} };
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
                          onChange={(e) => updateEditingRole(u.id, e.target.value as Role)}
                        >
                          {allowedRoles.map((r) => (
                            <option key={r} value={r}>
                              {normalizeRoleLabel(r)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-sm text-slate-700">{summarizeModules(u.modules)}</td>
                      <td>
                        <div className="space-y-1">
                          {availableModules.map((m) => {
                            const selected = edit.modules[m.id];
                            return (
                              <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selected)}
                                    onChange={(e) => toggleUserModule(u.id, m.id, e.target.checked)}
                                  />
                                  <span>{m.name}</span>
                                </label>
                                <label className="flex items-center gap-1 text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    disabled={!selected || edit.role === "COMMISSIONER"}
                                    checked={selected?.canWrite || false}
                                    onChange={(e) => toggleUserWrite(u.id, m.id, e.target.checked)}
                                  />
                                  <span>Write</span>
                                </label>
                              </div>
                            );
                          })}
                          {!availableModules.length && <span className="muted text-xs">No modules available.</span>}
                        </div>
                      </td>
                      <td className="flex gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => updateUser(u.id)}
                          disabled={savingUserId === u.id}
                        >
                          {savingUserId === u.id ? "Saving..." : "Save"}
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
