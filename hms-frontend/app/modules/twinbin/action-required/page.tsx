'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ApiError, TwinbinApi } from "@lib/apiClient";

export default function TwinbinActionRequiredPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await TwinbinApi.listActionRequired();
        setVisits(res.visits || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load action required visits");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["ACTION_OFFICER"]}>
        <div className="page">
          <h1>Twinbin - Action Required</h1>
          {error && <div className="alert error">{error}</div>}
          {loading ? (
            <div className="muted">Loading...</div>
          ) : visits.length === 0 ? (
            <div className="muted">No action required items.</div>
          ) : (
            <div className="grid grid-2">
              {visits.map((v) => (
                <div key={v.id} className="card card-hover">
                  <h3>{v.bin?.areaName}</h3>
                  <p className="muted">{v.bin?.locationName}</p>
                  <p className="muted">Employee: {v.submittedBy?.name || v.submittedById}</p>
                  <p className="muted">QC Remark: {v.qcRemark || "-"}</p>
                  <Link className="btn btn-primary btn-sm" href={`/modules/twinbin/action-required/${v.id}`}>
                    Open
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
