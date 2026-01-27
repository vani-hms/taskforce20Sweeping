'use client';

import { useState } from "react";
import { CityApi } from "@lib/apiClient";

export default function CreateCityPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [ulbCode, setUlbCode] = useState("");
  const [status, setStatus] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await CityApi.create({ name, code, ulbCode });
      setStatus("City created");
      setName("");
      setCode("");
      setUlbCode("");
    } catch {
      setStatus("Failed to create city");
    }
  };

  return (
    <div className="card">
      <h2>Create City</h2>
      <form onSubmit={handleCreate} className="form">
        <div className="form-field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Code</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="form-field">
          <label>ULB Code</label>
          <input className="input" value={ulbCode} onChange={(e) => setUlbCode(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">
          Create
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
