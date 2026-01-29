'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, CityModulesApi, CityUserApi, GeoApi } from "@lib/apiClient";
import type { Role } from "../../../types/auth";
import { roleLabel, moduleLabel } from "@lib/labels";
import { canonicalizeModules } from "@utils/modules";

type CityModule = { id: string; key: string; name: string; enabled?: boolean };
type UserModule = { id: string; key: string; name: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] };
type CityUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  modules: UserModule[];
  zoneIds?: string[];
  wardIds?: string[];
};
type EditableUser = {
  name: string;
  role: Role;
  modules: Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>;
  zoneIds: Set<string>;
  wardIds: Set<string>;
};

const allowedRoles: Role[] = ["COMMISSIONER", "ACTION_OFFICER", "QC", "EMPLOYEE"];
const enforceRoleWriteRules = (
  role: Role,
  modules: Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>
) =>
  role === "COMMISSIONER"
    ? Object.fromEntries(Object.keys(modules).map((id) => [id, { canWrite: false, zoneIds: modules[id]?.zoneIds, wardIds: modules[id]?.wardIds }]))
    : modules;
const toModuleMap = (modules: UserModule[] = []) =>
  modules.reduce<Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>>((acc, m) => {
    acc[m.id] = { canWrite: m.canWrite, zoneIds: m.zoneIds || [], wardIds: m.wardIds || [] };
    return acc;
  }, {});
const summarizeModules = (modules: UserModule[]) =>
  modules.length
    ? modules.map((m) => `${moduleLabel(m.key, m.name)}${m.canWrite ? " (Write)" : " (Read)"}`).join(", ")
    : "—";

const formatNames = (ids: Iterable<string>, lookup: Record<string, string>) => {
  const arr = Array.from(ids);
  if (!arr.length) return "—";
  return arr.map((id) => lookup[id] || id).join(", ");
};

export default function CityUsersPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<CityUser[]>([]);
  const [availableModules, setAvailableModules] = useState<CityModule[]>([]);
  const [newUserModules, setNewUserModules] = useState<Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>>({});
  const [newZoneIds, setNewZoneIds] = useState<Set<string>>(new Set());
  const [newWardIds, setNewWardIds] = useState<Set<string>>(new Set());
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string; parentId?: string | null }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditableUser>>({});

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [users]
  );
  const zoneLookup = useMemo(() => Object.fromEntries(zones.map((z) => [z.id, z.name])), [zones]);
  const wardLookup = useMemo(() => Object.fromEntries(wards.map((w) => [w.id, w.name])), [wards]);

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const modules = await CityModulesApi.list();
      const enabledModules = canonicalizeModules(modules).filter((m) => m.enabled !== false);
      setAvailableModules(enabledModules);
    } catch (err: any) {
      setError(err?.message || "Failed to load modules");
    } finally {
      setLoadingModules(false);
    }
  };

  const loadGeo = async () => {
    setLoadingGeo(true);
    try {
      const [zonesData, wardsData] = await Promise.all([GeoApi.list("ZONE"), GeoApi.list("WARD")]);
      setZones((zonesData.nodes || []).map((z: any) => ({ id: z.id, name: z.name })));
      setWards((wardsData.nodes || []).map((w: any) => ({ id: w.id, name: w.name, parentId: w.parentId || null })));
    } catch (err: any) {
      setError(err?.message || "Failed to load zones/wards");
    } finally {
      setLoadingGeo(false);
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
          modules: toModuleMap(u.modules),
          zoneIds: new Set(u.zoneIds || []),
          wardIds: new Set(u.wardIds || [])
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
    loadGeo();
    loadUsers();
  }, []);

  const updateNewModuleSelection = (moduleId: string, checked: boolean) => {
    setNewUserModules((prev) => {
      const next = { ...prev };
      if (checked) next[moduleId] = { canWrite: false, zoneIds: Array.from(newZoneIds), wardIds: Array.from(newWardIds) };
      else delete next[moduleId];
      return enforceRoleWriteRules(role, next);
    });
  };

  const updateNewModuleWrite = (moduleId: string, canWrite: boolean) => {
    setNewUserModules((prev) => {
      if (!prev[moduleId]) return prev;
      return enforceRoleWriteRules(role, { ...prev, [moduleId]: { ...prev[moduleId], canWrite } });
    });
  };

  const changeNewUserRole = (nextRole: Role) => {
    setRole(nextRole);
    setNewUserModules((prev) => enforceRoleWriteRules(nextRole, { ...prev }));
  };

  const toggleNewZone = (id: string) => {
    setNewZoneIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // keep module scopes in sync for QC to inherit
      setNewUserModules((mods) =>
        role === "QC"
          ? Object.fromEntries(
              Object.entries(mods).map(([mid, val]) => [
                mid,
                { ...val, zoneIds: Array.from(next), wardIds: val.wardIds }
              ])
            )
          : mods
      );
      return next;
    });
  };

  const toggleNewWard = (id: string) => {
    setNewWardIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      setNewUserModules((mods) =>
        role === "QC"
          ? Object.fromEntries(
              Object.entries(mods).map(([mid, val]) => [
                mid,
                { ...val, wardIds: Array.from(next), zoneIds: val.zoneIds }
              ])
            )
          : mods
      );
      return next;
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    setError("");
    try {
      if (role === "QC" && (newZoneIds.size === 0 || newWardIds.size === 0)) {
        setStatus("");
        setError("QC users require at least one zone and ward");
        return;
      }
      const modules = Object.entries(newUserModules).map(([moduleId, { canWrite, zoneIds, wardIds }]) => ({
        moduleId,
        canWrite,
        ...(role === "QC" ? { zoneIds: zoneIds || Array.from(newZoneIds), wardIds: wardIds || Array.from(newWardIds) } : {})
      }));
      await CityUserApi.create({
        email,
        name,
        password,
        role,
        zoneIds: Array.from(newZoneIds),
        wardIds: Array.from(newWardIds),
        modules
      });
      setStatus("User created");
      setEmail("");
      setName("");
      setPassword("");
      setNewUserModules({});
      setNewZoneIds(new Set());
      setNewWardIds(new Set());
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
      if (checked)
        modules[moduleId] = {
          canWrite: false,
          zoneIds: current.role === "QC" ? Array.from(current.zoneIds) : [],
          wardIds: current.role === "QC" ? Array.from(current.wardIds) : []
        };
      else delete modules[moduleId];
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const toggleUserWrite = (userId: string, moduleId: string, canWrite: boolean) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current || !current.modules[moduleId]) return prev;
      const modules = { ...current.modules, [moduleId]: { ...current.modules[moduleId], canWrite } };
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const toggleUserZone = (userId: string, zoneId: string) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const nextZones = new Set(current.zoneIds);
      nextZones.has(zoneId) ? nextZones.delete(zoneId) : nextZones.add(zoneId);
      const modules =
        current.role === "QC"
          ? Object.fromEntries(
              Object.entries(current.modules).map(([mid, val]) => [
                mid,
                { ...val, zoneIds: Array.from(nextZones), wardIds: val.wardIds }
              ])
            )
          : current.modules;
      return { ...prev, [userId]: { ...current, zoneIds: nextZones, modules } };
    });
  };

  const toggleUserWard = (userId: string, wardId: string) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const nextWards = new Set(current.wardIds);
      nextWards.has(wardId) ? nextWards.delete(wardId) : nextWards.add(wardId);
      const modules =
        current.role === "QC"
          ? Object.fromEntries(
              Object.entries(current.modules).map(([mid, val]) => [
                mid,
                { ...val, wardIds: Array.from(nextWards), zoneIds: val.zoneIds }
              ])
            )
          : current.modules;
      return { ...prev, [userId]: { ...current, wardIds: nextWards, modules } };
    });
  };

  const updateUser = async (id: string) => {
    const payload = editing[id];
    if (!payload) return;
    setSavingUserId(id);
    setError("");
    try {
      if (payload.role === "QC" && (payload.zoneIds.size === 0 || payload.wardIds.size === 0)) {
        setError("QC users require at least one zone and ward");
        setSavingUserId(null);
        return;
      }
      const modules = Object.entries(payload.modules).map(([moduleId, { canWrite, zoneIds, wardIds }]) => ({
        moduleId,
        canWrite,
        ...(payload.role === "QC"
          ? {
              zoneIds: zoneIds && zoneIds.length ? zoneIds : Array.from(payload.zoneIds),
              wardIds: wardIds && wardIds.length ? wardIds : Array.from(payload.wardIds)
            }
          : {})
      }));
      await CityUserApi.update(id, {
        name: payload.name,
        role: payload.role,
        zoneIds: Array.from(payload.zoneIds),
        wardIds: Array.from(payload.wardIds),
        modules
      });
      await loadUsers();
      setStatus("User updated");
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
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Zones</label>
            <div className="pill-grid">
              {zones.map((z) => (
                <label key={z.id} className="pill">
                  <input
                    type="checkbox"
                    checked={newZoneIds.has(z.id)}
                    onChange={() => toggleNewZone(z.id)}
                    disabled={loadingGeo}
                  />{" "}
                  {z.name}
                </label>
              ))}
              {!zones.length && <span className="muted text-xs">No zones found</span>}
            </div>
          </div>
          <div className="field">
            <label>Wards</label>
            <div className="pill-grid">
              {wards
                .filter((w) => newZoneIds.size === 0 || (w.parentId && newZoneIds.has(w.parentId)))
                .map((w) => (
                  <label key={w.id} className="pill">
                    <input
                      type="checkbox"
                      checked={newWardIds.has(w.id)}
                      onChange={() => toggleNewWard(w.id)}
                      disabled={loadingGeo}
                    />{" "}
                    {w.name}
                  </label>
                ))}
              {!wards.length && <span className="muted text-xs">No wards found</span>}
            </div>
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
                        <span>{moduleLabel(m.key, m.name)}</span>
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
                  <th>Zones / Wards</th>
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
                              {roleLabel(r)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="space-y-2 text-sm">
                          <div>
                            <div className="muted text-xs mb-1">
                              Zones{" "}
                              <span className="text-slate-500">
                                ({formatNames(edit.zoneIds, zoneLookup)})
                              </span>
                            </div>
                            <div className="pill-grid">
                              {zones.map((z) => (
                                <label key={z.id} className="pill">
                                  <input
                                    type="checkbox"
                                    checked={edit.zoneIds.has(z.id)}
                                    onChange={() => toggleUserZone(u.id, z.id)}
                                  />{" "}
                                  {z.name}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="muted text-xs mb-1">
                              Wards{" "}
                              <span className="text-slate-500">
                                ({formatNames(edit.wardIds, wardLookup)})
                              </span>
                            </div>
                            <div className="pill-grid">
                              {wards
                                .filter((w) => edit.zoneIds.size === 0 || (w.parentId && edit.zoneIds.has(w.parentId)))
                                .map((w) => (
                                  <label key={w.id} className="pill">
                                    <input
                                      type="checkbox"
                                      checked={edit.wardIds.has(w.id)}
                                      onChange={() => toggleUserWard(u.id, w.id)}
                                    />{" "}
                                    {w.name}
                                  </label>
                                ))}
                            </div>
                          </div>
                        </div>
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
                                  <span>{moduleLabel(m.key, m.name)}</span>
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
                                {edit.role === "QC" && selected && (
                                  <div className="text-xs text-slate-600 flex flex-col gap-1">
                                    <div>
                                      Zones: {selected.zoneIds?.length ? selected.zoneIds.length : "—"} | Wards:{" "}
                                      {selected.wardIds?.length ? selected.wardIds.length : "—"}
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-xs"
                                      onClick={() =>
                                        setEditing((prev) => {
                                          const cur = prev[u.id];
                                          if (!cur) return prev;
                                          const modules = {
                                            ...cur.modules,
                                            [m.id]: {
                                              ...cur.modules[m.id],
                                              zoneIds: Array.from(cur.zoneIds),
                                              wardIds: Array.from(cur.wardIds)
                                            }
                                          };
                                          return { ...prev, [u.id]: { ...cur, modules } };
                                        })
                                      }
                                    >
                                      Apply city scope
                                    </button>
                                  </div>
                                )}
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
