'use client';

import { useState } from "react";
import { apiFetch } from "@lib/apiClient";

type Level = "KOTHI" | "SUB_KOTHI" | "GALI";

export default function ExtendedHierarchyPage() {
  const [level, setLevel] = useState<Level>("KOTHI");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [status, setStatus] = useState("");

  const createNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      // API placeholder: POST /city/geo
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ level, name, parentId }) });
      setStatus(`Created ${level}`);
    } catch {
      setStatus("Failed to create");
    }
  };

  return (
    <div className="card">
      <h2>Optional Hierarchy (Kothi / Sub-Kothi / Gali)</h2>
      <form onSubmit={createNode}>
        <label>Level</label>
        <select value={level} onChange={(e) => setLevel(e.target.value as Level)} style={{ marginLeft: 8 }}>
          <option value="KOTHI">Kothi</option>
          <option value="SUB_KOTHI">Sub-Kothi</option>
          <option value="GALI">Gali</option>
        </select>
        <div style={{ marginTop: 12 }}>
          <input
            style={{ padding: 8, marginRight: 8 }}
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            style={{ padding: 8, marginRight: 8 }}
            placeholder="Parent ID"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          />
          <button type="submit">Create</button>
        </div>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
