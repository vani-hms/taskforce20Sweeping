'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Bin = {
  id: string;
  areaName: string;
  locationName: string;
  condition: string;
  status: string;
  createdAt: string;
};

export default function TwinbinAssignedPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await TwinbinApi.assigned();
        setBins(res.bins || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load assigned bins");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE"]}>
        <div className="page">
          <h1>Assigned Twinbin Bins</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : bins.length === 0 ? (
            <div className="muted">No bins assigned to you.</div>
          ) : (
            <div className="table-grid">
              <div className="table-head">
                <div>Area</div>
                <div>Location</div>
                <div>Condition</div>
                <div>Assigned</div>
                <div>Action</div>
              </div>
              {bins.map((b) => (
                <div className="table-row" key={b.id}>
                  <div>{b.areaName}</div>
                  <div>{b.locationName}</div>
                  <div>{b.condition}</div>
                  <div>{new Date(b.createdAt).toLocaleString()}</div>
                  <div>
                    <Link className="btn btn-primary btn-sm" href={`/modules/twinbin/assigned/${b.id}`}>
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
