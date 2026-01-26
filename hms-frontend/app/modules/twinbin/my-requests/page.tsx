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
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE"]}>
        <div className="page">
          <h1>My Twinbin Requests</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : bins.length === 0 ? (
            <div className="muted">No requests yet.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <div>Area</div>
                <div>Location</div>
                <div>Condition</div>
                <div>Status</div>
                <div>Created</div>
              </div>
              {bins.map((b) => (
                <div className="table-row" key={b.id}>
                  <div>{b.areaName}</div>
                  <div>{b.locationName}</div>
                  <div>{b.condition}</div>
                  <div>
                    <span className={`badge ${statusClass[b.status] || ""}`}>{b.status}</span>
                  </div>
                  <div>{new Date(b.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}
