'use client';

import { useState } from "react";
import { CityApi } from "@lib/apiClient";

export default function CreateCityPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await CityApi.create({ name, code });
      setStatus("City created");
      setName("");
      setCode("");
    } catch {
      setStatus("Failed to create city");
    }
  };

  return (
    <div className="card">
      <h2>Create City</h2>
      <form onSubmit={handleCreate}>
        <div style={{ marginBottom: 12 }}>
          <label>Name</label>
          <input style={{ width: "100%", padding: 8 }} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Code</label>
          <input style={{ width: "100%", padding: 8 }} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <button type="submit">Create</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
