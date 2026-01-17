'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { TaskforceApi, ApiError } from "@lib/apiClient";

type Case = { id: string; title: string; status: string };

export default function TaskforceTasksPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    TaskforceApi.listCases()
      .then((data) => setCases(data.cases || []))
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setError("Not authorized for Taskforce in this city.");
        } else {
          setError("Failed to load tasks.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      await TaskforceApi.updateCase(id, { status });
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  return (
    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "ACTION_OFFICER", "HMS_SUPER_ADMIN", "CITY_ADMIN"]}>
      <div className="card">
        <h3>My Taskforce Tasks</h3>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !cases.length && !error && <p>No tasks assigned.</p>}
        <ul>
          {cases.map((c) => (
            <li key={c.id} style={{ marginBottom: 8 }}>
              <strong>{c.title}</strong> — {c.status}{" "}
              <button onClick={() => updateStatus(c.id, "IN_PROGRESS")}>Start</button>{" "}
              <button onClick={() => updateStatus(c.id, "COMPLETED")}>Complete</button>
            </li>
          ))}
        </ul>
      </div>
    </ModuleGuard>
  );
}
