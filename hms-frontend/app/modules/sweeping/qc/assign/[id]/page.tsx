"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, EmployeesApi, apiFetch } from "@lib/apiClient";

type Employee = {
  id: string;
  name: string;
  email: string;
};

export default function SweepingAssignPage() {
  const params = useParams();
  const router = useRouter();
  const beatId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await EmployeesApi.list("SWEEPING");
      setEmployees(res.employees || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  async function assign(employeeId: string) {
    try {
      await apiFetch(`/modules/sweeping/qc/beats/${beatId}/assign`, {
        method: "POST",
        body: JSON.stringify({ employeeId })
      });

      alert("Beat assigned");
      router.push("/modules/sweeping/qc");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Assign failed");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="alert error">{error}</div>;

  return (
    <Protected>
      <ModuleGuard module="SWEEPING" roles={["QC"]}>
        <div className="page">
          <div className="card">
            <h2>Assign Beat</h2>
            <p className="muted">Select employee for this beat</p>
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.email}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => assign(e.id)}
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!employees.length && <div className="muted">No employees found</div>}
          </div>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
