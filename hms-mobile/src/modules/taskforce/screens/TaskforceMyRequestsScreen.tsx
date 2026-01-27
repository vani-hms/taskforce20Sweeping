import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTaskforceFeederRequests, ApiError } from "../../../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceMyRequests">;

type Request = {
  id: string;
  feederPointName: string;
  areaName: string;
  status: string;
  createdAt: string;
  populationDensity?: string;
  accessibilityLevel?: string;
};

export default function TaskforceMyRequestsScreen({ navigation }: { navigation: Nav }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const res = await listTaskforceFeederRequests();
      setRequests(res.feederPoints || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.cardTitle}>{item.feederPointName}</Text>
        <StatusChip status={item.status} />
      </View>
      <Text style={styles.cardSubtitle}>{item.areaName}</Text>
      <Text style={styles.meta}>
        {item.populationDensity || "-"} · {item.accessibilityLevel || "-"}
      </Text>
      <Text style={styles.metaSmall}>{new Date(item.createdAt).toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Feeder Requests</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : requests.length === 0 ? (
        <Text style={styles.muted}>No requests yet.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
        />
      )}
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING_QC: "#fbbf24",
    APPROVED: "#22c55e",
    REJECTED: "#ef4444",
    ACTION_REQUIRED: "#fb923c"
  };
  return (
    <Text style={[styles.badge, { backgroundColor: colors[status] || "#94a3b8" }]}>{status}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  title: { color: "#e2e8f0", fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  muted: { color: "#94a3b8", textAlign: "center", marginBottom: 20 },
  error: { color: "#fca5a5", textAlign: "center", marginBottom: 12 },
  card: {
    backgroundColor: "#0b253a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a8a"
  },
  cardTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#cbd5e1", marginTop: 4 },
  meta: { color: "#94a3b8", marginTop: 4 },
  metaSmall: { color: "#64748b", marginTop: 2, fontSize: 12 },
  badge: { color: "#0f172a", fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  button: {
    marginTop: 12,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" }
});
