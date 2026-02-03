'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";

const ROLE_LABEL:any = {
  EMPLOYEE: "Taskforce",
  QC: "Quality Checker",
  ACTION_OFFICER: "Action Officer"
};

export default function AssignmentsTab() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedBeats, setSelectedBeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter,setRoleFilter] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const beat: any = await SweepingApi.listBeats();
    const emp: any = await SweepingApi.listEmployees();
    setEmployees(emp.employees || []);
    setBeats(beat.beats || []);
    setLoading(false);
  };

  const toggleBeat = (id: string) => {
    setSelectedBeats(p =>
      p.includes(id) ? p.filter(b => b !== id) : [...p, id]
    );
  };

  const assign = async () => {
    if (!selectedEmployee || selectedBeats.length === 0)
      return alert("Select employee + beats");

    setAssigning(true);
    await SweepingApi.assignBeats(selectedEmployee.id, selectedBeats);
    alert("Assigned successfully");
    setSelectedBeats([]);
    setSelectedEmployee(null);
    setAssigning(false);
    load();
  };

  if (loading) return <div className="skeleton h-40 rounded-xl" />;

  /* EMPLOYEE FILTER */
  const filteredEmployees = employees.filter(e => {
    if(roleFilter !== "ALL" && e.role !== roleFilter) return false;
    return e.name.toLowerCase().includes(search.toLowerCase());
  });

  /* GROUP BEATS BY WARD */
  const beatsByWard = beats.reduce((acc:any,b:any)=>{
    const ward = b.geoNodeBeat.parent?.name || "Unknown Ward";
    acc[ward] = acc[ward] || [];
    acc[ward].push(b);
    return acc;
  },{});

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* EMPLOYEES */}
      <div className="card">

        <div className="flex-between mb-2">
          <b>👷 Staff</b>
          <span className="badge">{employees.length}</span>
        </div>

        <select
          className="select w-full mb-2"
          value={roleFilter}
          onChange={e=>setRoleFilter(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          <option value="EMPLOYEE">Taskforce</option>
          <option value="QC">Quality Checker</option>
          <option value="ACTION_OFFICER">Action Officer</option>
        </select>

        <input
          className="input w-full mb-3"
          placeholder="Search staff..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="space-y-2 max-h-[520px] overflow-auto">

          {filteredEmployees.map(e => (
            <div
              key={e.id}
              onClick={() => setSelectedEmployee(e)}
              className={`flex gap-3 p-3 rounded-xl cursor-pointer border ${
                selectedEmployee?.id === e.id
                  ? "bg-blue-50 border-blue-400"
                  : "hover:bg-slate-50"
              }`}
            >

              <div className="avatar">{e.name[0]}</div>

              <div className="flex-1">
                <div className="font-semibold text-sm">{e.name}</div>
                <div className="text-xs muted">{e.email}</div>
              </div>

              <span className="badge text-xs">
                {ROLE_LABEL[e.role] || e.role}
              </span>

            </div>
          ))}

        </div>

      </div>

      {/* BEATS */}
      <div className="card">

        <div className="flex-between mb-2">
          <b>📍 Ward Beats</b>

          {selectedEmployee && (
            <button
              className="btn btn-primary btn-sm"
              disabled={assigning}
              onClick={assign}
            >
              Assign {selectedBeats.length}
            </button>
          )}
        </div>

        {selectedEmployee && (
          <div className="text-xs muted mb-2">
            Assigning to: <b>{selectedEmployee.name}</b>
          </div>
        )}

        <div className="space-y-4 max-h-[520px] overflow-auto">

          {Object.entries(beatsByWard).map(([ward,list]:any)=>(
            <div key={ward}>

              <div className="font-semibold text-sm mb-2">
                🏘 {ward}
              </div>

              <div className="grid grid-cols-2 gap-2">

                {list.map((b:any)=>{
                  const sel = selectedBeats.includes(b.id);
                  return(
                    <div
                      key={b.id}
                      onClick={()=>toggleBeat(b.id)}
                      className={`p-3 rounded-xl cursor-pointer border text-sm ${
                        sel
                          ? "bg-blue-50 border-blue-400"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold">
                        {b.geoNodeBeat.name}
                      </div>
                    </div>
                  )
                })}

              </div>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}
