'use client';

import { useEffect, useMemo, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi, EmployeesApi, GeoApi } from "@lib/apiClient";

type Bin = {
  id: string;
  areaName: string;
  areaType: string;
  locationName: string;
  roadType?: string;
  isFixedProperly?: boolean;
  hasLid?: boolean;
  condition: string;
  latitude?: number;
  longitude?: number;
  status: string;
  createdAt: string;
  zoneId?: string | null;
  wardId?: string | null;
  requestedById?: string;
  assignedEmployeeIds?: string[];
};

type Employee = { id: string; name: string; email: string };

export default function TwinbinQcPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [assignIds, setAssignIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
  const [wardMap, setWardMap] = useState<Record<string, string>>({});

  const activeBin = useMemo(() => bins.find((b) => b.id === reviewId) || null, [bins, reviewId]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [binRes, empRes, zoneRes, wardRes] = await Promise.all([
        TwinbinApi.pending(),
        EmployeesApi.list("TWINBIN"),
        GeoApi.list("ZONE"),
        GeoApi.list("WARD")
      ]);
      setBins(binRes.bins || []);
      const emps = (empRes.employees || []).filter((e: any) => e.role === "EMPLOYEE");
      setEmployees(emps.map((e: any) => ({ id: e.id, name: e.name, email: e.email })));
      setZoneMap(Object.fromEntries((zoneRes.nodes || []).map((n: any) => [n.id, n.name])));
      setWardMap(Object.fromEntries((wardRes.nodes || []).map((n: any) => [n.id, n.name])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAssign = (id: string) => {
    setAssignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const approve = async () => {
    if (!activeBin) return;
    setActionStatus("Approving...");
    setActionError("");
    try {
      await TwinbinApi.approve(activeBin.id, { assignedEmployeeIds: Array.from(assignIds) });
      setBins((prev) => prev.filter((b) => b.id !== activeBin.id));
      setReviewId(null);
      setAssignIds(new Set());
      setActionStatus("Approved");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to approve");
      setActionStatus("");
    }
  };

  const reject = async () => {
    if (!activeBin) return;
    setActionStatus("Rejecting...");
    setActionError("");
    try {
      await TwinbinApi.reject(activeBin.id);
      setBins((prev) => prev.filter((b) => b.id !== activeBin.id));
      setReviewId(null);
      setAssignIds(new Set());
      setActionStatus("Rejected");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to reject");
      setActionStatus("");
    }
  };

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["QC"]}>
        <div className="page">
          <h1>Twinbin - QC</h1>
          <div style={{ marginBottom: 12 }}>
            <a className="btn btn-secondary btn-sm" href="/modules/twinbin/qc/visits">
              Pending Visit Reports
            </a>
            <a className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} href="/modules/twinbin/qc/reports">
              Pending Bin Reports
            </a>
          </div>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : bins.length === 0 ? (
            <div className="muted">No pending bins.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Area</div>
                <div>Type</div>
                <div>Location</div>
                <div>Condition</div>
                <div>Requested By</div>
                <div>Created</div>
                <div>Action</div>
              </div>
              {bins.map((b) => (
                <div className="table-row" key={b.id}>
                  <div>{b.areaName}</div>
                  <div>{b.areaType}</div>
                  <div>{b.locationName}</div>
                  <div>{b.condition}</div>
                  <div>{employeeMap[b.requestedById || ""]?.name || "-"}</div>
                  <div>{new Date(b.createdAt).toLocaleString()}</div>
                  <div>
                    <button className="btn btn-primary btn-sm" onClick={() => setReviewId(b.id)}>
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeBin && (
            <div className="modal-backdrop">
              <div className="modal">
                <div className="modal-header">
                  <h3>Review Bin</h3>
                  <button className="icon-button" onClick={() => setReviewId(null)}>
                    x
                  </button>
                </div>
                <div className="modal-body">
                  <div className="grid grid-2">
                    <div>
                      <label>Area</label>
                      <div className="muted">{activeBin.areaName}</div>
                    </div>
                    <div>
                      <label>Area Type</label>
                      <div className="muted">{activeBin.areaType}</div>
                    </div>
                    <div>
                      <label>Location</label>
                      <div className="muted">{activeBin.locationName}</div>
                    </div>
                    <div>
                      <label>Road Type</label>
                      <div className="muted">{activeBin.roadType || "-"}</div>
                    </div>
                    <div>
                      <label>Fixed Properly</label>
                      <div className="muted">{activeBin.isFixedProperly ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <label>Has Lid</label>
                      <div className="muted">{activeBin.hasLid ? "Yes" : "No"}</div>
                    </div>
                    <div>
                      <label>Condition</label>
                      <div className="muted">{activeBin.condition}</div>
                    </div>
                    <div>
                      <label>Zone</label>
                      <div className="muted">{(activeBin.zoneId && zoneMap[activeBin.zoneId]) || "-"}</div>
                    </div>
                    <div>
                      <label>Ward</label>
                      <div className="muted">{(activeBin.wardId && wardMap[activeBin.wardId]) || "-"}</div>
                    </div>
                    <div>
                      <label>Requested By</label>
                      <div className="muted">{employeeMap[activeBin.requestedById || ""]?.name || "-"}</div>
                    </div>
                    <div>
                      <label>Coordinates</label>
                      <div className="muted">
                        {activeBin.latitude}, {activeBin.longitude}{" "}
                        {activeBin.latitude && activeBin.longitude ? (
                          <a
                            className="link"
                            href={`https://www.google.com/maps?q=${activeBin.latitude},${activeBin.longitude}`}
                            target="_blank"
                          >
                            (Map)
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <label>Assign Employees</label>
                  <div className="pill-grid">
                    {employees.map((e) => (
                      <label key={e.id} className="pill">
                        <input
                          type="checkbox"
                          checked={assignIds.has(e.id)}
                          onChange={() => toggleAssign(e.id)}
                        />{" "}
                        {e.name}
                      </label>
                    ))}
                  </div>

                  {actionError && <div className="alert error">{actionError}</div>}
                  {actionStatus && <div className="alert success">{actionStatus}</div>}
                </div>
                <div className="modal-footer">
                  <button className="btn" onClick={() => setReviewId(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={reject}>
                    Reject
                  </button>
                  <button className="btn btn-primary" onClick={approve}>
                    Approve & Assign
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

