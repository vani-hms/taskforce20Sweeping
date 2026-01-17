'use client';

import { useState } from "react";
import { apiFetch } from "@lib/apiClient";

export default function CityAdminCredentialPage() {
  const [cityId, setCityId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      // API placeholder: POST /hms/cities/:cityId/admins
      await apiFetch(`/hms/cities/${cityId}/admins`, {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus("Credential created and emailed.");
    } catch {
      setStatus("Failed to create credential.");
    }
  };

  return (
    <div className="card">
      <h2>Create City Admin Credentials</h2>
      <form onSubmit={handleCreate}>
        <div style={{ marginBottom: 12 }}>
          <label>City ID</label>
          <input style={{ width: "100%", padding: 8 }} value={cityId} onChange={(e) => setCityId(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Admin Email</label>
          <input style={{ width: "100%", padding: 8 }} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit">Create Credential</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
