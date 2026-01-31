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
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE"]}>
        <div className="content">
          <header className="mb-6">
            <p className="eyebrow">Litter Bins</p>
            <h1>Assigned Bins</h1>
            <p className="muted">View and manage bins assigned to you for inspection.</p>
          </header>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          {loading ? (
            <div className="card p-8 text-center muted">Loading assigned bins...</div>
          ) : bins.length === 0 ? (
            <div className="card p-8 text-center muted">No bins assigned to you at the moment.</div>
          ) : (
            <div className="grid grid-2">
              {bins.map((b) => (
                <div key={b.id} className="card card-hover flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-bold">{b.areaName}</div>
                      <div className="muted text-sm">{b.locationName || "Location N/A"}</div>
                    </div>
                    <span className="badge badge-info text-xs">{b.condition}</span>
                  </div>

                  <div className="text-sm muted mt-1">
                    Assigned: {new Date(b.createdAt).toLocaleDateString()}
                  </div>

                  <div className="card-divider"></div>

                  <Link className="btn btn-primary w-full" href={`/modules/twinbin/assigned/${b.id}`}>
                    Open & Report
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}
