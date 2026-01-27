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
        <div className="form-field">
          <label>City ID</label>
          <input className="input" value={cityId} onChange={(e) => setCityId(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Admin Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Create Credential
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
