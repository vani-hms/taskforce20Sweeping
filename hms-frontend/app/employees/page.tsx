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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await EmployeesApi.list();
      setEmployees(
        (data.employees || []).map((e: any) => ({
          ...e,
          modules: (e.modules || []).map((m: any) => ({ key: m.key, name: m.name || m.key }))
        }))
      );
    } catch {
      setError("Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <h1>Employees</h1>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="muted">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="muted">No employees to display.</div>
      ) : (
        <div className="table">
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
