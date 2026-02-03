'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, GeoApi, TaskforceApi } from "@lib/apiClient";

type FeederPoint = {
  id: string;
  feederPointName: string;
  areaName: string;
  areaType: string;
  locationDescription: string;
  zoneId?: string | null;
  wardId?: string | null;
  status: string;
  createdAt: string;
  assignedAt?: string;
};

export default function TaskforceAssignedPage() {
  const [feeders, setFeeders] = useState<FeederPoint[]>([]);
  const [zones, setZones] = useState<Record<string, string>>({});
  const [wards, setWards] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [assignedRes, zoneRes, wardRes] = await Promise.all([
          TaskforceApi.assigned(),
          GeoApi.list("ZONE"),
          GeoApi.list("WARD")
        ]);
        setFeeders(assignedRes.feederPoints || []);
        setZones(Object.fromEntries((zoneRes.nodes || []).map((n: any) => [n.id, n.name])));
        setWards(Object.fromEntries((wardRes.nodes || []).map((n: any) => [n.id, n.name])));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load assigned feeder points");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(
    () =>
      feeders.map((f) => ({
        ...f,
        zoneName: f.zoneId ? zones[f.zoneId] || f.zoneId : "-",
        wardName: f.wardId ? wards[f.wardId] || f.wardId : "-"
      })),
    [feeders, zones, wards]
  );

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE"]}>
        <div className="page">
          <h1>Assigned Feeder Points</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="muted">No feeder points assigned to you.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Name</div>
                <div>Location</div>
                <div>Zone/Ward</div>
                <div>Status</div>
                <div>Assigned</div>
                <div>Action</div>
              </div>
              {rows.map((f) => (
                <div className="table-row" key={f.id}>
                  <div>{f.feederPointName}</div>
                  <div>
                    <div>{f.areaName}</div>
                    <div className="muted text-xs">{f.locationDescription}</div>
                  </div>
                  <div>
                    {f.zoneName} / {f.wardName}
                  </div>
                  <div>
                    <span className="badge">{f.status}</span>
                  </div>
                  <div>
                    {f.assignedAt ? new Date(f.assignedAt).toLocaleString() : "-"}
                  </div>
                  <div>
                    <Link className="btn btn-primary btn-sm" href={`/modules/taskforce/assigned/${f.id}`}>
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}
