import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTaskforceFeederRequests, ApiError } from "../../../api/auth";
import TaskforceLayout from "../components/TaskforceLayout";

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
    <TaskforceLayout
      title="My Feeder Requests"
      subtitle="Track your submissions"
      navigation={navigation}
    >
      <View style={styles.container}>
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
      </View>
    </TaskforceLayout>
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
  container: { flex: 1, padding: 20, backgroundColor: "#f8fafc" },
  muted: { color: "#64748b", textAlign: "center", marginBottom: 20 },
  error: { color: "#dc2626", textAlign: "center", marginBottom: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  },
  cardTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#475569", marginTop: 4 },
  meta: { color: "#64748b", marginTop: 4 },
  metaSmall: { color: "#94a3b8", marginTop: 2, fontSize: 12 },
  badge: { color: "#0f172a", fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
});
