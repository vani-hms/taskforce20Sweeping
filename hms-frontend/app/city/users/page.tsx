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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold">Users in this city</h3>
            <p className="muted text-sm">Managing roles and specific module visibility.</p>
          </div>
          {(loadingUsers || loadingModules) && (
            <div className="flex items-center gap-2 text-sm muted">
              <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
              Loading...
            </div>
          )}
        </div>

        {error && <div className="alert error mb-4">{error}</div>}

        {!loadingUsers && sortedUsers.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <p className="muted">No users found for this city.</p>
          </div>
        )}

        {!loadingUsers && sortedUsers.length > 0 && (
          <div className="space-y-4">
            {sortedUsers.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                edit={editing[u.id] || { name: u.name, role: u.role, modules: {}, zoneIds: new Set(), wardIds: new Set() }}
                zones={zones}
                wards={wards}
                availableModules={availableModules}
                savingUserId={savingUserId}
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser}
                onUpdateEditingRole={updateEditingRole}
                onToggleUserZone={toggleUserZone}
                onToggleUserWard={toggleUserWard}
                onToggleUserModule={toggleUserModule}
                onToggleUserWrite={toggleUserWrite}
                setEditing={setEditing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  u,
  edit,
  zones,
  wards,
  availableModules,
  savingUserId,
  onUpdateUser,
  onDeleteUser,
  onUpdateEditingRole,
  onToggleUserZone,
  onToggleUserWard,
  onToggleUserModule,
  onToggleUserWrite,
  setEditing
}: {
  u: CityUser;
  edit: EditableUser;
  zones: any[];
  wards: any[];
  availableModules: CityModule[];
  savingUserId: string | null;
  onUpdateUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onUpdateEditingRole: (id: string, role: Role) => void;
  onToggleUserZone: (id: string, zid: string) => void;
  onToggleUserWard: (id: string, wid: string) => void;
  onToggleUserModule: (id: string, mid: string, checked: boolean) => void;
  onToggleUserWrite: (id: string, mid: string, canWrite: boolean) => void;
  setEditing: React.Dispatch<React.SetStateAction<Record<string, EditableUser>>>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`border rounded-xl transition-all duration-300 ${isExpanded ? 'border-primary shadow-xl ring-1 ring-primary/5 bg-white' : 'border-slate-200 hover:border-slate-300 shadow-sm bg-white/50'}`}>
      {/* Summary Row */}
      <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4 flex-1">
          <div className="avatar shadow-sm border border-primary/10">{u.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              {u.name}
              {u.role === 'QC' && <span className="badge badge-sm badge-success" style={{ fontSize: '8px', padding: '2px 6px' }}>QC active</span>}
            </div>
            <div className="text-xs muted font-medium">{u.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="badge">{roleLabel(u.role)}</div>
            <div className="text-[10px] muted uppercase font-bold tracking-wider mt-1 scale-90 origin-right">Role</div>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-slate-700">
              {Object.keys(edit.modules).length} Module{Object.keys(edit.modules).length !== 1 ? 's' : ''}
            </div>
            <div className="text-[10px] muted uppercase font-bold tracking-wider scale-90 origin-right">Assigned</div>
          </div>

          <button className={`btn btn-sm min-w-[100px] ${isExpanded ? 'btn-primary shadow-md' : 'btn-secondary'}`}>
            {isExpanded ? 'Collapse' : 'Manage Access'}
          </button>
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Column 1: Core Identity & Geo Scope */}
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-xs font-bold text-slate-500">Edit Name</label>
                  <input
                    className="input"
                    value={edit.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setEditing((prev) => ({ ...prev, [u.id]: { ...edit, name: e.target.value } }))
                    }
                  />
                </div>
                <div className="field">
                  <label className="text-xs font-bold text-slate-500">Global Role</label>
                  <select
                    className="input"
                    value={edit.role}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateEditingRole(u.id, e.target.value as Role)}
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Territorial Scope</h4>
                  {edit.role === 'QC' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase">Required for QC</span>}
                </div>

                <div className="space-y-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <div className="text-xs font-bold mb-3 flex justify-between items-center text-slate-600">
                      <span>Available Zones</span>
                      <span className="badge badge-sm">{edit.zoneIds.size}</span>
                    </div>
                    <div className="pill-grid">
                      {zones.map((z) => (
                        <label key={z.id} className={`pill ${edit.zoneIds.has(z.id) ? 'pill-active' : ''}`} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={edit.zoneIds.has(z.id)}
                            onChange={() => onToggleUserZone(u.id, z.id)}
                          />
                          {z.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <div className="text-xs font-bold mb-3 flex justify-between items-center text-slate-600">
                      <span>Related Wards</span>
                      <span className="badge badge-sm">{edit.wardIds.size}</span>
                    </div>
                    <div className="pill-grid max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {wards
                        .filter((w) => edit.zoneIds.size === 0 || (w.parentId && edit.zoneIds.has(w.parentId)))
                        .map((w) => (
                          <label key={w.id} className={`pill ${edit.wardIds.has(w.id) ? 'pill-active' : ''}`} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={edit.wardIds.has(w.id)}
                              onChange={() => onToggleUserWard(u.id, w.id)}
                            />
                            {w.name}
                          </label>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Module Permissions */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Capability Management</h4>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                {availableModules.map((m) => {
                  const selected = edit.modules[m.id];
                  return (
                    <div key={m.id} className={`px-4 py-3 transition-colors ${selected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 py-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={Boolean(selected)}
                            onChange={(e) => onToggleUserModule(u.id, m.id, e.target.checked)}
                          />
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${selected ? 'text-indigo-900' : 'text-slate-600'}`}>{moduleLabel(m.key, m.name)}</span>
                            {selected && edit.role === "QC" && (
                              <span className="text-[10px] text-indigo-500 font-bold mt-0.5 uppercase tracking-tighter">
                                Scope: {selected.zoneIds?.length || 0}Z / {selected.wardIds?.length || 0}W
                              </span>
                            )}
                          </div>
                        </label>

                        {selected && (
                          <div className="flex items-center gap-3">
                            <label className={`flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${selected?.canWrite ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="hidden"
                                disabled={edit.role === "COMMISSIONER"}
                                checked={selected?.canWrite || false}
                                onChange={(e) => onToggleUserWrite(u.id, m.id, e.target.checked)}
                              />
                              {selected?.canWrite ? 'WRITE' : 'READ ONLY'}
                            </label>

                            {edit.role === "QC" && (
                              <button
                                type="button"
                                className="btn btn-xs btn-secondary border-dashed"
                                title="Copy city scope to this module"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                  });
                                }}
                              >
                                Sync
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between bg-white -mx-6 -mb-6 p-6 rounded-b-xl">
            <div className="flex flex-col">
              <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Record Unique ID</div>
              <div className="text-[10px] font-bold text-slate-300 font-mono mt-1">{u.id}</div>
            </div>

            <div className="flex gap-3">
              <button
                className="btn btn-danger btn-sm border-none shadow-sm"
                onClick={(e) => { e.stopPropagation(); onDeleteUser(u.id); }}
                disabled={savingUserId === u.id}
              >
                Permanently Delete
              </button>
              <button
                className="btn btn-primary btn-sm min-w-[140px] shadow-lg shadow-primary/20"
                onClick={(e) => { e.stopPropagation(); onUpdateUser(u.id); }}
                disabled={savingUserId === u.id}
              >
                {savingUserId === u.id ? 'Saving Changes...' : 'Push Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
