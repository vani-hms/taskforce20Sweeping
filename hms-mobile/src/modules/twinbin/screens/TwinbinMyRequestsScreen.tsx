import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { listTwinbinMyRequests, ApiError } from "../../../api/auth";

export default function TwinbinMyRequestsScreen() {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listTwinbinMyRequests();
      setBins(data.bins || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Bin Requests</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!bins.length ? (
        <Text style={styles.muted}>No requests yet.</Text>
      ) : (
        <FlatList
          data={bins}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.areaName}</Text>
              <Text style={styles.muted}>{item.locationName}</Text>
              <Text style={styles.muted}>Condition: {item.condition}</Text>
              <Text style={[styles.badge, badgeStyle(item.status)]}>{item.status}</Text>
              <Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function badgeStyle(status: string) {
  if (status === "APPROVED") return { backgroundColor: "#dcfce7", color: "#166534" };
  if (status === "REJECTED") return { backgroundColor: "#fee2e2", color: "#991b1b" };
  return { backgroundColor: "#fef9c3", color: "#92400e" };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  muted: { color: "#4b5563", marginTop: 4 },
  error: { color: "#dc2626", marginBottom: 8 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
    fontWeight: "700"
  }
});
