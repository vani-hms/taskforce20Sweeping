import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTaskforceAssigned } from "../../../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceAssigned">;

type Feeder = {
  id: string;
  feederPointName: string;
  areaName: string;
  areaType: string;
  locationDescription: string;
  zoneName?: string;
  zoneId?: string | null;
  wardName?: string;
  wardId?: string | null;
  status: string;
  assignedAt?: string;
  updatedAt?: string;
};

export default function TaskforceAssignedScreen({ navigation }: { navigation: Nav }) {
  const [feeders, setFeeders] = useState<Feeder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setError("");
    try {
      const res = await listTaskforceAssigned();
      setFeeders(res.feederPoints || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load assigned feeder points");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: Feeder }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("TaskforceFeederDetail", { feeder: item })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.title}>{item.feederPointName}</Text>
        <Text style={styles.badge}>{item.status}</Text>
      </View>
      <Text style={styles.muted}>{item.areaName} - {item.areaType}</Text>
      <Text style={styles.meta}>{item.locationDescription}</Text>
      <Text style={styles.meta}>Zone/Ward: {item.zoneName ?? item.zoneId ?? "-"} / {item.wardName ?? item.wardId ?? "-"}</Text>
      <Text style={styles.meta}>
        Assigned: {item.assignedAt ? new Date(item.assignedAt).toLocaleString() : item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Assigned Feeder Points</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : feeders.length === 0 ? (
        <Text style={styles.muted}>No feeder points assigned.</Text>
      ) : (
        <FlatList
          data={feeders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0f172a" },
  header: { color: "#e2e8f0", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  card: {
    backgroundColor: "#0b253a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a8a"
  },
  title: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  badge: {
    backgroundColor: "#1e3a8a",
    color: "#bfdbfe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 12,
    overflow: "hidden"
  },
  muted: { color: "#94a3b8", marginTop: 4 },
  meta: { color: "#cbd5e1", marginTop: 6, fontSize: 13 },
  error: { color: "#fca5a5" }
});
