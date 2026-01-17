'use client';

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/apiClient";

type Zone = { id: string; name: string };

export default function ZoneManagementPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    apiFetch<{ zones: Zone[] }>("/city/zones")
      .then((data) => setZones(data.zones || []))
      .catch(() => setZones([]));
  }, []);

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/city/zones", { method: "POST", body: JSON.stringify({ name }) });
    setZones((prev) => [...prev, { id: crypto.randomUUID(), name }]);
    setName("");
  };

  return (
    <div className="card">
      <h2>Zone Management</h2>
      <form onSubmit={createZone}>
        <input style={{ padding: 8, marginRight: 8 }} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Add Zone</button>
      </form>
      <ul>
        {zones.map((z) => (
          <li key={z.id}>{z.name}</li>
        ))}
      </ul>
    </div>
  );
}
