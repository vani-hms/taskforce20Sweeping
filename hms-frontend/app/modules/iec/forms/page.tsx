'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { ApiError, IecApi } from "@lib/apiClient";

type Form = { id: string; title: string; description?: string; status: string; createdAt: string };

export default function IecFormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await IecApi.listForms();
      setForms(data.forms || []);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Not authorized for IEC in this city.");
      } else {
        setError("Failed to load IEC forms.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateStatus("Saving...");
    try {
      await IecApi.createForm({ title, description: description || undefined });
      setCreateStatus("Created form");
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create form";
      setCreateStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModuleGuard module="IEC" roles={["EMPLOYEE", "QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="grid grid-2">
        <div className="card">
          <h3>Create IEC Form</h3>
          <form onSubmit={createForm} className="form">
            <label>Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label>Description</label>
            <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
            <button className="btn btn-primary" type="submit">
              {saving ? "Saving..." : "Create"}
            </button>
            {createStatus && <div className="muted">{createStatus}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Forms</h3>
          {loading && <p>Loading...</p>}
          {error && <p className="alert error">{error}</p>}
          {!loading && !forms.length && !error && <p>No forms.</p>}
          <div className="table">
            <div className="table-head">
              <div>Title</div>
              <div>Status</div>
              <div>Created</div>
            </div>
            {forms.map((f) => (
              <div className="table-row" key={f.id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{f.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {f.id}
                  </div>
                </div>
                <div>{f.status}</div>
                <div>{new Date(f.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
