import React, { useEffect, useMemo, useState } from "react";
import {
  listRegistrationRequests,
  listModules,
  listGeo,
  approveRegistrationRequest,
  ApiError
} from "../api/auth";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";

type Request = { id: string; name: string; status: string };
type Module = { id: string; key: string; name: string; enabled: boolean };
type GeoNode = { id: string; name: string; parentId?: string | null };

export default function RegistrationRequestsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [role, setRole] = useState<"EMPLOYEE" | "QC" | "ACTION_OFFICER" | "">("");
  const [moduleIds, setModuleIds] = useState<Set<string>>(new Set());
  const [zoneIds, setZoneIds] = useState<Set<string>>(new Set());
  const [wardIds, setWardIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqRes, mods, zonesRes, wardsRes] = await Promise.all([
        listRegistrationRequests(),
        listModules(),
        listGeo("ZONE"),
        listGeo("WARD")
      ]);
      setRequests(reqRes.requests || []);
      setModules(mods.filter((m) => m.enabled));
      setZones(zonesRes.nodes || []);
      setWards(wardsRes.nodes || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const filteredWards = useMemo(
    () => wards.filter((w) => zoneIds.size === 0 || (w.parentId && zoneIds.has(w.parentId))),
    [wards, zoneIds]
  );

  const canApprove = !!selectedReq && !!role && moduleIds.size > 0 && !saving;

  const onApprove = async () => {
    if (!selectedReq || !role || moduleIds.size === 0) return;
    setSaving(true);
    setStatusMsg("");
    try {
      await approveRegistrationRequest(selectedReq, {
        role,
        moduleKeys: modules.filter((m) => moduleIds.has(m.id)).map((m) => m.key.toUpperCase()),
        zoneIds: Array.from(zoneIds),
        wardIds: Array.from(wardIds)
      });
      setStatusMsg("Approved request");
      setSelectedReq(null);
      setRole("");
      setModuleIds(new Set());
      setZoneIds(new Set());
      setWardIds(new Set());
      await load();
    } catch (err: any) {
      setStatusMsg(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registration Requests</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {requests.length === 0 ? <Text style={styles.muted}>No registration requests.</Text> : null}
      {requests.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.cardTitle}>{r.name}</Text>
              <Text style={styles.muted}>Status: {r.status}</Text>
            </View>
            {r.status === "PENDING" && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => setSelectedReq(r.id)}>
                <Text style={{ color: "#1d4ed8" }}>Assign & Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {selectedReq && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assignments</Text>
          <Text style={styles.label}>Role</Text>
          <View style={styles.pillRow}>
            {["EMPLOYEE", "QC", "ACTION_OFFICER"].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.pill, role === r ? styles.pillActive : undefined]}
                onPress={() => setRole(r as any)}
              >
                <Text style={{ color: role === r ? "#0f172a" : "#334155" }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Modules (select at least one)</Text>
          <View style={styles.pillRow}>
            {modules.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.pill, moduleIds.has(m.id) ? styles.pillActive : undefined]}
                onPress={() => toggle(setModuleIds, m.id)}
              >
                <Text style={{ color: moduleIds.has(m.id) ? "#0f172a" : "#334155" }}>{m.name || m.key}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Zones (optional)</Text>
          <View style={styles.pillRow}>
            {zones.map((z) => (
              <TouchableOpacity
                key={z.id}
                style={[styles.pill, zoneIds.has(z.id) ? styles.pillActive : undefined]}
                onPress={() => toggle(setZoneIds, z.id)}
              >
                <Text style={{ color: zoneIds.has(z.id) ? "#0f172a" : "#334155" }}>{z.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Wards (optional)</Text>
          <View style={styles.pillRow}>
            {filteredWards.map((w) => (
              <TouchableOpacity
                key={w.id}
                style={[styles.pill, wardIds.has(w.id) ? styles.pillActive : undefined]}
                onPress={() => toggle(setWardIds, w.id)}
              >
                <Text style={{ color: wardIds.has(w.id) ? "#0f172a" : "#334155" }}>{w.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {statusMsg ? <Text style={[styles.muted, { marginTop: 8 }]}>{statusMsg}</Text> : null}
          <TouchableOpacity
            style={[styles.button, !canApprove ? { opacity: 0.5 } : undefined]}
            disabled={!canApprove}
            onPress={onApprove}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setSelectedReq(null)}>
            <Text style={{ color: "#1d4ed8", textAlign: "center" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f5f7fb", flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  muted: { color: "#475569" },
  error: { color: "#dc2626", marginBottom: 8 },
  label: { fontWeight: "600", marginTop: 8, marginBottom: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc"
  },
  pillActive: { backgroundColor: "#cbd5e1", borderColor: "#94a3b8" },
  button: {
    marginTop: 12,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  linkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#e0f2fe" }
});
