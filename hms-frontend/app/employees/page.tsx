'use client';

import { useEffect, useState } from "react";
import { EmployeesApi } from "@lib/apiClient";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  modules: { key: string; name: string }[];
  zones: string[];
  wards: string[];
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [moduleTabs, setModuleTabs] = useState<string[]>([]);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  const load = async (moduleKey?: string) => {
    if (moduleKey) setFiltering(true);
    setLoading(true);
    setError("");
    try {
      const data = await EmployeesApi.list(moduleKey);
      const mapped =
        (data.employees || []).map((e: any) => ({
          ...e,
          modules: (e.modules || []).map((m: any) => ({ key: m.key, name: m.name || m.key }))
        }));
      setEmployees(mapped);
      if (!moduleTabs.length) {
        // derive tabs from QC modules if present in payload
        const allModules = new Set<string>();
        mapped.forEach((e) => e.modules.forEach((m) => allModules.add(m.key)));
        if (allModules.size) {
          const tabs = Array.from(allModules);
          setModuleTabs(tabs);
          setActiveModule(tabs[0] ?? null);
        }
      }
    } catch {
      setError("Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (activeModule) {
      load(activeModule);
    }
  }, [activeModule]);

  return (
    <div className="page">
      <h1>Employees</h1>
      {error && <div className="alert error">{error}</div>}
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {moduleTabs.map((m) => (
          <button
            key={m}
            className={`pill ${activeModule === m ? "pill-active" : ""}`}
            onClick={() => setActiveModule(m)}
          >
            {m.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
        {moduleTabs.length > 0 && (
          <button className={`pill ${activeModule === null ? "pill-active" : ""}`} onClick={() => setActiveModule(null)}>
            All
          </button>
        )}
      </div>
      {loading || filtering ? (
        <div className="muted">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="muted">
          {activeModule ? "No employees assigned to this module." : "No employees to display."}
        </div>
      ) : (
        <div className="table-grid">
          <div className="table-head">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Modules</div>
            <div>Zone / Ward</div>
          </div>
          {employees.map((e) => (
            <div className="table-row" key={e.id}>
              <div>{e.name}</div>
              <div>{e.email}</div>
              <div>{e.role}</div>
              <div>{e.modules.map((m) => m.name || m.key).join(", ")}</div>
              <div>
                {[...e.zones, ...e.wards].length ? [...e.zones, ...e.wards].join(", ") : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
