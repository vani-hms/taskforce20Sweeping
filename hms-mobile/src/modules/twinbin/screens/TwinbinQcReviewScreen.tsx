import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { approveTwinbinBin, rejectTwinbinBin, ApiError, listGeo } from "../../../api/auth";
import { listEmployees } from "../../../api/employees";
import { useAuthContext } from "../../../auth/AuthProvider";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcReview">;

export default function TwinbinQcReviewScreen({ route, navigation }: Props) {
  const { bin } = route.params;
  const [assignIds, setAssignIds] = useState<Set<string>>(new Set());
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
  const [wardMap, setWardMap] = useState<Record<string, string>>({});
  const { auth } = useAuthContext();
  const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [empRes, zonesRes, wardsRes] = await Promise.all([
        listEmployees("LITTERBINS"),
        listGeo("ZONE"),
        listGeo("WARD")
      ]);
      const onlyEmployees = (empRes.employees || []).filter((e) => e.role === "EMPLOYEE");
      setEmployees(onlyEmployees);
      setZoneMap(Object.fromEntries((zonesRes.nodes || []).map((n: any) => [n.id, n.name])));
      setWardMap(Object.fromEntries((wardsRes.nodes || []).map((n: any) => [n.id, n.name])));
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAssign = (id: string) => {
    setAssignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openMap = () => {
    if (bin.latitude && bin.longitude) {
      Linking.openURL(`https://www.google.com/maps?q=${bin.latitude},${bin.longitude}`);
    }
  };

  const approve = async () => {
    if (assignIds.size === 0) {
      setError("Select at least one employee before approving.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await approveTwinbinBin(bin.id, { assignedEmployeeIds: Array.from(assignIds) });
      Alert.alert("Approved", "Bin approved and employees assigned", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    setActionLoading(true);
    setError("");
    try {
      await rejectTwinbinBin(bin.id);
      Alert.alert("Rejected", "Bin has been rejected", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!isQc) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Access restricted to QC users.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Review Bin</Text>
      <View style={styles.card}>
        <LabelValue label="Area Name" value={bin.areaName} />
        <LabelValue label="Area Type" value={bin.areaType} />
        <LabelValue label="Location Name" value={bin.locationName} />
        <LabelValue label="Road Type" value={bin.roadType} />
        <LabelValue label="Fixed Properly" value={bin.isFixedProperly ? "Yes" : "No"} />
        <LabelValue label="Has Lid" value={bin.hasLid ? "Yes" : "No"} />
        <LabelValue label="Condition" value={bin.condition} />
        <LabelValue label="Zone" value={(bin.zoneId && zoneMap[bin.zoneId]) || "-"} />
        <LabelValue label="Ward" value={(bin.wardId && wardMap[bin.wardId]) || "-"} />
        <LabelValue label="Coordinates" value={`${bin.latitude}, ${bin.longitude}`} />
        {bin.latitude && bin.longitude ? (
          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Text style={styles.buttonText}>Open in Maps</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.subtitle}>Assign Employees</Text>
      <View style={styles.card}>
        {employees.length === 0 ? (
          <Text style={styles.muted}>No employees available for Twinbin.</Text>
        ) : (
          employees.map((emp) => (
            <TouchableOpacity key={emp.id} style={styles.assignRow} onPress={() => toggleAssign(emp.id)}>
              <View style={[styles.checkbox, assignIds.has(emp.id) ? styles.checkboxChecked : undefined]} />
              <View>
                <Text style={styles.assignName}>{emp.name}</Text>
                <Text style={styles.muted}>{emp.email}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.reject]} onPress={reject} disabled={actionLoading}>
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.approve,
            assignIds.size === 0 ? { backgroundColor: "#9ca3af" } : undefined
          ]}
          onPress={approve}
          disabled={actionLoading || assignIds.size === 0}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  subtitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, marginTop: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#475569", fontWeight: "600" },
  value: { color: "#0f172a", fontWeight: "600", marginLeft: 12, flexShrink: 1, textAlign: "right" },
  mapButton: {
    marginTop: 8,
    backgroundColor: "#0ea5e9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#4b5563" },
  assignRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#94a3b8",
    marginRight: 10
  },
  checkboxChecked: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  assignName: { fontWeight: "700", color: "#0f172a" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4
  },
  approve: { backgroundColor: "#16a34a" },
  reject: { backgroundColor: "#dc2626" },
  error: { color: "#dc2626", marginBottom: 8 }
});
