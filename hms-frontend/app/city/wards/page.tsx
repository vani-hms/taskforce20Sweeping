'use client';

import { useEffect, useState } from "react";
import { apiFetch } from "@lib/apiClient";

type Ward = { id: string; name: string; zoneId: string };

export default function WardManagementPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");

  useEffect(() => {
    apiFetch<{ wards: Ward[] }>("/city/wards")
      .then((data) => setWards(data.wards || []))
      .catch(() => setWards([]));
  }, []);

  const createWard = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/city/wards", { method: "POST", body: JSON.stringify({ name, zoneId }) });
    setWards((prev) => [...prev, { id: crypto.randomUUID(), name, zoneId }]);
    setName("");
  };

  return (
    <div className="card">
      <h2>Ward Management</h2>
      <form onSubmit={createWard}>
        <input
          style={{ padding: 8, marginRight: 8 }}
          value={name}
          placeholder="Ward Name"
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={{ padding: 8, marginRight: 8 }}
          value={zoneId}
          placeholder="Zone ID"
          onChange={(e) => setZoneId(e.target.value)}
        />
        <button type="submit">Add Ward</button>
      </form>
      <ul>
        {wards.map((w) => (
          <li key={w.id}>
            {w.name} (Zone {w.zoneId})
          </li>
        ))}
      </ul>
    </div>
  );
}
