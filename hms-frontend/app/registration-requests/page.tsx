'use client';

import { useEffect, useMemo, useState } from "react";
import { CityModulesApi, GeoApi, RegistrationApi } from "@lib/apiClient";

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
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{
    requestId: string;
    role: "EMPLOYEE" | "QC" | "ACTION_OFFICER" | "";
    moduleIds: Set<string>;
    zoneIds: Set<string>;
    wardIds: Set<string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqs, mods, zonesData, wardsData] = await Promise.all([
        RegistrationApi.listRequests(),
        CityModulesApi.list(),
        GeoApi.list("ZONE"),
        GeoApi.list("WARD")
      ]);
      setRequests(reqs.requests || []);
      setModules(mods);
      setZones((zonesData.nodes || []).map((z: any) => ({ id: z.id, name: z.name })));
      setWards((wardsData.nodes || []).map((w: any) => ({ id: w.id, name: w.name })));
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
      moduleIds: new Set<string>(),
      zoneIds: new Set<string>(),
      wardIds: new Set<string>()
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
        moduleKeys: modules.filter((m) => modal.moduleIds.has(m.id)).map((m) => m.key.toUpperCase()),
        zoneIds: Array.from(modal.zoneIds),
        wardIds: Array.from(modal.wardIds)
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

              <label>Zones (optional)</label>
              <div className="pill-grid">
                {zones.map((z) => (
                  <label key={z.id} className="pill">
                    <input
                      type="checkbox"
                      checked={modal.zoneIds.has(z.id)}
                      onChange={() =>
                        setModal((mod) => (mod ? { ...mod, zoneIds: toggleSet(mod.zoneIds, z.id) } : mod))
                      }
                    />{" "}
                    {z.name}
                  </label>
                ))}
              </div>

              <label>Wards (optional)</label>
              <div className="pill-grid">
                {wards.map((w) => (
                  <label key={w.id} className="pill">
                    <input
                      type="checkbox"
                      checked={modal.wardIds.has(w.id)}
                      onChange={() =>
                        setModal((mod) => (mod ? { ...mod, wardIds: toggleSet(mod.wardIds, w.id) } : mod))
                      }
                    />{" "}
                    {w.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={!modalValid || saving} onClick={onApprove}>
                {saving ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .modal {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          width: min(640px, 95vw);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }
        .modal-header,
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .modal-body {
          display: grid;
          gap: 12px;
          margin: 12px 0;
        }
        .pill-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pill {
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
