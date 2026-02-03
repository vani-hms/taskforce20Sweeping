'use client';

import { useEffect, useMemo, useState } from "react";
import { ApiError, GeoApi, apiFetch } from "@lib/apiClient";

type GeoNode = { id: string; name: string; parentId?: string | null; level: string; areaType?: string };

const AREA_TYPES = [
  { label: "Residential", value: "RESIDENTIAL" },
  { label: "Commercial", value: "COMMERCIAL" },
  { label: "Slum", value: "SLUM" }
];


interface EditState {
  id: string;
  name: string;
  areaType?: string;
}

export default function AreasPage() {
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [areas, setAreas] = useState<GeoNode[]>([]);
  const [beats, setBeats] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Area
  const [zoneForArea, setZoneForArea] = useState("");
  const [wardForArea, setWardForArea] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaType, setAreaType] = useState("");
  const [areaStatus, setAreaStatus] = useState("");
  const [savingArea, setSavingArea] = useState(false);


  // Create Beat

  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");


  // Edit / Delete
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const loadGeo = async () => {
    try {
      setLoading(true);
      setError("");
      const [zonesRes, wardsRes, areasRes, beatsRes] = await Promise.all([
        GeoApi.list("ZONE"),
        GeoApi.list("WARD"),
        GeoApi.list("AREA"),
        GeoApi.list("BEAT")
      ]);
      setZones((zonesRes as any).nodes ?? []);
      setWards((wardsRes as any).nodes ?? []);
      setAreas((areasRes as any).nodes ?? []);
      setBeats((beatsRes as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load hierarchy";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeo();
  }, []);

  const wardsByZone = useMemo(() => {
    const map: Record<string, GeoNode[]> = {};
    wards.forEach((w) => {
      if (!w.parentId) return;
      map[w.parentId] = map[w.parentId] || [];
      map[w.parentId].push(w);
    });
    return map;
  }, [wards]);

  const areasByWard = useMemo(() => {
    const map: Record<string, GeoNode[]> = {};
    areas.forEach((a) => {
      if (!a.parentId) return;
      map[a.parentId] = map[a.parentId] || [];
      map[a.parentId].push(a);
    });
    return map;
  }, [areas]);

  const beatsByArea = useMemo(() => {
    const map: Record<string, GeoNode[]> = {};
    beats.forEach((b) => {
      if (!b.parentId) return;
      map[b.parentId] = map[b.parentId] || [];
      map[b.parentId].push(b);
    });
    return map;
  }, [beats]);

  const availableWardsForArea = zoneForArea ? wardsByZone[zoneForArea] || [] : [];

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForArea || !wardForArea || !areaName || !areaType) return;
    setSavingArea(true);
    setAreaStatus("Saving...");
    try {
      await GeoApi.create({ level: "AREA", name: areaName, parentId: wardForArea, areaType });
      setAreaStatus("Area created");
      setAreaName("");
      setAreaType("");
      await loadGeo();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create area";
      setAreaStatus(msg);
    } finally {
      setSavingArea(false);
    }
  };


  const handleUploadBeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beatFile) return;

    const form = new FormData();
    form.append("file", beatFile);

    setUploadStatus("Uploading...");

    try {
      const res = await apiFetch("/modules/sweeping/admin/upload-kml", {
        method: "POST",
        body: form,
        headers: {}
      });

      alert(`Upload successful. Beats created`);
      setBeatFile(null);
      setUploadStatus("");
      await loadGeo();
    } catch (err) {
      console.error(err);
      setUploadStatus("Upload failed");
    }
  };


  const startEdit = (node: GeoNode) => {
    setEditing({ id: node.id, name: node.name, areaType: node.areaType });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveEdit = async (node: GeoNode) => {
    if (!editing) return;
    setBusyId(node.id);
    try {
      const payload: any = {};
      if (editing.name && editing.name !== node.name) payload.name = editing.name;
      if (node.level === "AREA" && editing.areaType && editing.areaType !== node.areaType) {
        payload.areaType = editing.areaType;
      }
      if (Object.keys(payload).length === 0) {
        setEditing(null);
        setBusyId(null);
        return;
      }
      await GeoApi.update(node.id, payload);
      setEditing(null);
      await loadGeo();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const deleteNode = async (node: GeoNode) => {
    if (!confirm("Delete this item? Children will block deletion.")) return;
    setBusyId(node.id);
    setDeleteError("");
    try {
      await GeoApi.remove(node.id);
      await loadGeo();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const renderActions = (node: GeoNode) => {
    const isEditing = editing?.id === node.id;
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {!isEditing && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(node)} disabled={busyId === node.id}>
              ✏️
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteNode(node)} disabled={busyId === node.id}>
              🗑️
            </button>
          </>
        )}
        {isEditing && (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(node)} disabled={busyId === node.id}>
              ✔️
            </button>
            <button className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={busyId === node.id}>
              ✖️
            </button>
          </>
        )}
      </div>
    );
  };

  const renderHierarchy = () => {
    if (loading) return <div className="skeleton" style={{ height: 80 }} />;
    if (error) return <div className="alert error">{error}</div>;
    if (zones.length === 0) return <div className="muted">No hierarchy yet.</div>;

    const editField = (node: GeoNode) => {
      const isEditing = editing?.id === node.id;
      if (!isEditing) return null;
      return (
        <div style={{ display: "grid", gap: 6, maxWidth: 260, marginTop: 8 }}>
          <input
            className="input"
            value={editing?.name || ""}
            onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
          />
          {node.level === "AREA" && (
            <select
              className="input"
              value={editing?.areaType || ""}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, areaType: e.target.value } : prev))}
            >
              <option value="">Select area type</option>
              {AREA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {zones.map((z) => (
          <div key={z.id} className="card" style={{ borderColor: "#e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{z.name}</div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {z.id}
                </div>
              </div>
              {renderActions(z)}
            </div>
            {editField(z)}
            {(wardsByZone[z.id] || []).map((w) => (
              <div key={w.id} style={{ marginLeft: 12, paddingLeft: 12, borderLeft: "2px solid #e5e7eb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                      {w.id}
                    </div>
                  </div>
                  {renderActions(w)}
                </div>
                {editField(w)}
                {(areasByWard[w.id] || []).map((a) => (
                  <div key={a.id} style={{ marginLeft: 12, paddingLeft: 12, borderLeft: "2px dashed #e5e7eb" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div>
                          <strong>{a.name}</strong> ({a.areaType || "—"})
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                          {a.id}
                        </div>
                      </div>
                      {renderActions(a)}
                    </div>
                    {editField(a)}
                    {(beatsByArea[a.id] || []).map((b) => (
                      <div
                        key={b.id}
                        style={{ marginLeft: 12, paddingLeft: 12, borderLeft: "1px dotted #cbd5e1" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div>{b.name}</div>
                            <div className="muted" style={{ fontSize: 12 }}>
                              {b.id}
                            </div>
                          </div>
                          {renderActions(b)}
                        </div>
                        {editField(b)}
                      </div>
                    ))}
                    {(beatsByArea[a.id] || []).length === 0 && (
                      <div className="muted" style={{ marginLeft: 12, fontSize: 12 }}>
                        No beats
                      </div>
                    )}
                  </div>
                ))}
                {(areasByWard[w.id] || []).length === 0 && (
                  <div className="muted" style={{ marginLeft: 12, fontSize: 12 }}>
                    No areas
                  </div>
                )}
              </div>
            ))}
            {(wardsByZone[z.id] || []).length === 0 && (
              <div className="muted" style={{ marginLeft: 12, fontSize: 12 }}>
                No wards
              </div>
            )}
          </div>
        ))}
        {deleteError && <div className="alert error">{deleteError}</div>}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="card">
        <div className="breadcrumb">
          <span>City Admin</span>
          <span>/</span>
          <span>Area & Beat Management</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Area & Beat Management</h2>
        <p className="muted">Manage area types and beats under wards for the active city.</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Area</h3>
          <p className="muted" style={{ marginTop: -6 }}>
            Define an area name and type under a ward.
          </p>
          <form onSubmit={handleCreateArea} className="form">
            <label>Select Zone</label>
            <select
              className="input"
              value={zoneForArea}
              onChange={(e) => {
                setZoneForArea(e.target.value);
                setWardForArea("");
              }}
              required
              disabled={zones.length === 0}
            >
              <option value="">Select zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

            <label>Select Ward</label>
            <select
              className="input"
              value={wardForArea}
              onChange={(e) => setWardForArea(e.target.value)}
              required
              disabled={!zoneForArea || availableWardsForArea.length === 0}
            >
              <option value="">Select ward</option>
              {availableWardsForArea.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <label>Area Name</label>
            <input
              className="input"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              required
              disabled={!wardForArea}
            />

            <label>Area Type</label>
            <select
              className="input"
              value={areaType}
              onChange={(e) => setAreaType(e.target.value)}
              required
              disabled={!wardForArea}
            >
              <option value="">Select area type</option>
              {AREA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={!zoneForArea || !wardForArea || !areaName || !areaType || savingArea}
            >
              {savingArea ? "Saving..." : "Create Area"}
            </button>
            {areaStatus && <div className="muted">{areaStatus}</div>}
          </form>
        </div>

        <div className="card">
          <h3>Beat</h3>

          {/* ================= KML UPLOAD ================= */}

          <h3>Beat (KML Upload)</h3>

          <p className="muted">
            Upload ward-wise KML files containing beat polygons.
            Ward is auto-detected from beat names inside KML.
            Please ensure wards already exist.
          </p>

          <form onSubmit={handleUploadBeat} className="form">

            <label>Beat KML File</label>

            <input
              type="file"
              accept=".kml"
              onChange={(e) => setBeatFile(e.target.files?.[0] || null)}
            />

            <button
              className="btn btn-secondary"
              type="submit"
              disabled={!beatFile}
            >
              Upload Beat File
            </button>

            {uploadStatus && <div className="muted">{uploadStatus}</div>}
          </form>


          <hr style={{ margin: "12px 0" }} />

        </div>

      </div>

      <div className="card">
        <h3>Hierarchy</h3>
        {renderHierarchy()}
      </div>
    </div>
  );
}


// now can we stop here and try to test each and every flow of qc admin city admin action officer and emoployee so i need to create dummy kml file to test this so how can we create kml file from which we can work on this 