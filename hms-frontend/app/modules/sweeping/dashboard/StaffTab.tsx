'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";

export default function StaffTab() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res: any = await SweepingApi.listStaff();
    setEmployees(res.employees || []);
    setLoading(false);
  };

  if (loading) return <div className="skeleton h-40 rounded-xl" />;

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">

      <div className="flex-between mb-3">
        <b>👷 Sweeping Team</b>
        <span className="badge">{employees.length} Staff</span>
      </div>

      <input
        className="input w-full mb-4"
        placeholder="Search staff..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <table className="table">

        <thead>
          <tr>
            <th>Employee</th>
            <th>Assigned Beats</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {filtered.map(e => (
            <tr key={e.id}>

              <td>
                <div className="flex gap-3 items-center">

                  <div className="avatar">
                    {e.name[0]}
                  </div>

                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs muted">{e.email}</div>
                  </div>

                </div>
              </td>

              <td>
                <span className="badge">
                  {e.assignedBeats} Beats
                </span>
              </td>

              <td align="right">
                <a
                  href={`mailto:${e.email}`}
                  className="btn btn-sm btn-secondary"
                >
                  Contact
                </a>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

      {filtered.length === 0 && (
        <div className="text-center text-sm muted mt-6">
          No staff found
        </div>
      )}

    </div>
  );
}
