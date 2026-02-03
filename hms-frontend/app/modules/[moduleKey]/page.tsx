'use client';

import { useEffect, useState } from "react";
import { Protected } from "@components/Guards";
import { ApiError, ModuleRecordsApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

type RecordsResponse = { city: string; module: string; data: any[]; meta: { total: number } };

export default function ModuleRecordsPage({ params }: { params: { moduleKey: string } }) {
  const { moduleKey } = params;
  const normalizedKey = moduleKey.toUpperCase();
  const { user } = useAuth();
  const assigned = user?.modules?.find((m) => m.key === normalizedKey);
  const [data, setData] = useState<RecordsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assigned) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setError("");
      try {
        const res = await ModuleRecordsApi.getRecords(normalizedKey);
        setData(res);
      } catch (err: any) {
        const message = err instanceof ApiError ? err.message : "Failed to load module records";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assigned, normalizedKey]);

  return (
    <Protected>
      <div className="page">
        {!assigned ? (
          <div className="card">
            <h3>Module access required</h3>
            <p className="muted">You are not assigned to this module yet.</p>
          </div>
        ) : loading ? (
          <div className="card">
            <div className="skeleton" style={{ height: 12, width: 140 }} />
            <div className="skeleton" style={{ height: 12, width: 120, marginTop: 8 }} />
          </div>
        ) : error ? (
          <div className="card">
            <div className="alert error">{error}</div>
          </div>
        ) : data ? (
          <>
            <h1>{data.module}</h1>
            <p className="muted">City: {data.city}</p>
            <div className="card">
              <h3>Records</h3>
              <p>Total: {data.meta?.total || 0}</p>
              {data.data.length === 0 ? (
                <div className="muted">No records yet.</div>
              ) : (
                <ul className="list">
                  {data.data.map((r: any) => (
                    <li key={r.id}>
                      <div className="text-sm text-slate-700">Status: {r.status}</div>
                      <div className="text-xs text-slate-500">{r.id}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Protected>
  );
}
