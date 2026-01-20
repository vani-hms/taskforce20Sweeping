'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { ApiError, IecApi } from "@lib/apiClient";

type Summary = { status: string; count: number };

export default function IecReportsPage() {
  const [summary, setSummary] = useState<Summary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await IecApi.summary();
        setSummary(data.summary || []);
        setError("");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setError("Not authorized for IEC in this city.");
        } else {
          setError("Failed to load IEC summary.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ModuleGuard module="IEC" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="card">
        <h3>IEC Summary</h3>
        {loading && <p>Loading...</p>}
        {error && <p className="alert error">{error}</p>}
        {!loading && !summary.length && !error && <p>No data.</p>}
        <div className="table">
          <div className="table-head">
            <div>Status</div>
            <div>Count</div>
          </div>
          {summary.map((row) => (
            <div className="table-row" key={row.status}>
              <div>{row.status}</div>
              <div>{row.count}</div>
            </div>
          ))}
        </div>
      </div>
    </ModuleGuard>
  );
}
