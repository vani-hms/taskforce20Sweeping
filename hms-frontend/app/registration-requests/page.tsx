'use client';

import { useEffect, useMemo, useState } from "react";
import { CityModulesApi, RegistrationApi } from "@lib/apiClient";

type Request = {
  id: string;
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  status: string;
  createdAt: string;
};

const ROLE_OPTIONS: Array<"EMPLOYEE" | "QC" | "ACTION_OFFICER"> = ["EMPLOYEE", "QC", "ACTION_OFFICER"];

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [modules, setModules] = useState<{ id: string; key: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{
    requestId: string;
    role: "EMPLOYEE" | "QC" | "ACTION_OFFICER" | "";
    moduleIds: Set<string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqs, mods] = await Promise.all([RegistrationApi.listRequests(), CityModulesApi.list()]);
      setRequests(reqs.requests || []);
      setModules(mods);
    } catch {
      setError("Failed to load registration requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (req: Request) =>
    setModal({
      requestId: req.id,
      role: "",
      moduleIds: new Set<string>()
    });

  const closeModal = () => setModal(null);

  const toggleSet = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const onApprove = async () => {
    if (!modal) return;
    if (!modal.role || modal.moduleIds.size === 0) return;
    setSaving(true);
    try {
      await RegistrationApi.approve(modal.requestId, {
        role: modal.role as any,
        moduleKeys: modules.filter((m) => modal.moduleIds.has(m.id)).map((m) => m.key.toUpperCase())
      });
      closeModal();
      await load();
    } catch {
      setError("Failed to approve request");
    } finally {
      setSaving(false);
    }
  };

  const onReject = async (id: string) => {
    try {
      await RegistrationApi.reject(id);
      await load();
    } catch {
      setError("Failed to reject request");
    }
  };

  const modalValid = useMemo(() => modal && modal.role && modal.moduleIds.size > 0, [modal]);

  return (
    <div className="page">
      <h1>Registration Requests</h1>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="muted">Loading...</div>
      ) : (
        <div className="grid grid-2">
          {requests.length === 0 && <div className="muted">No requests.</div>}
          {requests.map((r) => (
            <div className="card" key={r.id}>
              <h3>{r.name}</h3>
              <p className="muted">{r.email}</p>
              <p className="muted">Phone: {r.phone}</p>
              <p className="muted">Aadhar: {r.aadhaar}</p>
              <p className="muted">Status: {r.status}</p>
              <p className="muted">Requested: {new Date(r.createdAt).toLocaleString()}</p>
              {r.status === "PENDING" && (
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-primary btn-sm" onClick={() => openModal(r)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => onReject(r.id)}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Approve Registration</h3>
              <button className="icon-button" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label>Role</label>
              <select
                className="input"
                value={modal.role}
                onChange={(e) => setModal((m) => (m ? { ...m, role: e.target.value as any } : m))}
              >
                <option value="">Select role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <label>Modules (select at least one)</label>
              <div className="pill-grid">
                {modules.map((m) => (
                  <label key={m.id} className="pill">
                    <input
                      type="checkbox"
                      checked={modal.moduleIds.has(m.id)}
                      onChange={() =>
                        setModal((mod) => (mod ? { ...mod, moduleIds: toggleSet(mod.moduleIds, m.id) } : mod))
                      }
                    />{" "}
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!modalValid || saving} onClick={onApprove}>
                {saving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
