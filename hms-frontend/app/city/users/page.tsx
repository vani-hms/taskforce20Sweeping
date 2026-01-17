'use client';

import { useState } from "react";
import { apiFetch } from "@lib/apiClient";
import { ModuleName, Role } from "@types/auth";

export default function CityUsersPage() {
  const [email, setEmail] = useState("");
  const [moduleName, setModuleName] = useState<ModuleName>("TASKFORCE");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [status, setStatus] = useState("");

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      // API placeholder: POST /city/users
      await apiFetch("/city/users", {
        method: "POST",
        body: JSON.stringify({ email, module: moduleName, role })
      });
      setStatus("User created");
      setEmail("");
    } catch {
      setStatus("Failed to create user");
    }
  };

  const resetPassword = async () => {
    // API placeholder: POST /city/users/:email/reset
    await apiFetch(`/city/users/${encodeURIComponent(email)}/reset`, { method: "POST" });
    setStatus("Password reset link sent");
  };

  const disableUser = async () => {
    // API placeholder: PATCH /city/users/:email/disable
    await apiFetch(`/city/users/${encodeURIComponent(email)}/disable`, { method: "PATCH" });
    setStatus("User disabled");
  };

  return (
    <div className="card">
      <h2>User Management</h2>
      <form onSubmit={createUser}>
        <input
          style={{ padding: 8, marginRight: 8 }}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select value={moduleName} onChange={(e) => setModuleName(e.target.value as ModuleName)} style={{ marginRight: 8 }}>
          <option value="TASKFORCE">Taskforce</option>
          <option value="IEC">IEC</option>
          <option value="MODULE3">Module3</option>
          <option value="MODULE4">Module4</option>
          <option value="MODULE5">Module5</option>
          <option value="MODULE6">Module6</option>
          <option value="MODULE7">Module7</option>
          <option value="MODULE8">Module8</option>
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ marginRight: 8 }}>
          <option value="EMPLOYEE">Employee</option>
          <option value="QC">QC</option>
          <option value="ACTION_OFFICER">Action Officer</option>
          <option value="COMMISSIONER">Commissioner</option>
        </select>
        <button type="submit">Create</button>
      </form>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={resetPassword}>Reset Password</button>
        <button onClick={disableUser}>Disable User</button>
      </div>
      {status && <p>{status}</p>}
    </div>
  );
}
