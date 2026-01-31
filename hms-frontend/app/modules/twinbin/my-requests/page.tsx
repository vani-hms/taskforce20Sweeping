'use client';

import { useEffect, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

type Bin = {
  id: string;
  areaName: string;
  locationName: string;
  condition: string;
  status: string;
  createdAt: string;
};

const statusClass: Record<string, string> = {
  PENDING_QC: "badge badge-warn",
  APPROVED: "badge badge-success",
  REJECTED: "badge badge-error"
};

export default function TwinbinMyRequestsPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await TwinbinApi.myRequests();
      setBins(data.bins || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["EMPLOYEE"]}>
        <div className="content">
          <header className="mb-6">
            <p className="eyebrow">Litter Bins</p>
            <h1>My Requests</h1>
            <p className="muted">Track the status of bins you have registered.</p>
          </header>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          {loading ? (
            <div className="card p-8 text-center muted">Loading requests...</div>
          ) : bins.length === 0 ? (
            <div className="card p-8 text-center muted">You have not submitted any requests yet.</div>
          ) : (
            <div className="grid grid-2">
              {bins.map((b) => (
                <div key={b.id} className="card flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-bold">{b.areaName}</div>
                      <div className="muted text-sm">{b.locationName}</div>
                    </div>
                    <span className={statusClass[b.status] || "badge"}>{b.status.replace(/_/g, " ")}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm muted mt-2">
                    <span>Condition: {b.condition}</span>
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
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
