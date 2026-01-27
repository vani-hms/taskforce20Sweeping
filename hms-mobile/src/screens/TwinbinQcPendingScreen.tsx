import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";
import { listTwinbinPending, ApiError } from "../api/auth";
import { useFocusEffect } from "@react-navigation/native";
import { listGeo } from "../api/auth";
import { useAuthContext } from "../auth/AuthProvider";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcPending">;

export default function TwinbinQcPendingScreen({ navigation }: Props) {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
  const [wardMap, setWardMap] = useState<Record<string, string>>({});
  const { auth } = useAuthContext();
  const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [binRes, zoneRes, wardRes] = await Promise.all([listTwinbinPending(), listGeo("ZONE"), listGeo("WARD")]);
      setBins(binRes.bins || []);
      setZoneMap(Object.fromEntries((zoneRes.nodes || []).map((n: any) => [n.id, n.name])));
      setWardMap(Object.fromEntries((wardRes.nodes || []).map((n: any) => [n.id, n.name])));
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load pending bins");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => load();

  if (!isQc) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Access restricted to QC users.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Twinbin Requests</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={bins}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.muted}>No pending requests.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("TwinbinQcReview", { bin: item })}
          >
            <Text style={styles.cardTitle}>{item.areaName}</Text>
            <Text style={styles.muted}>{item.locationName}</Text>
            <Text style={styles.badge}>Condition: {item.condition}</Text>
            <Text style={styles.meta}>
              Zone/Ward: {(item.zoneId && zoneMap[item.zoneId]) || "-"} / {(item.wardId && wardMap[item.wardId]) || "-"}
            </Text>
            <Text style={styles.meta}>Requested By: {item.requestedBy?.name || "-"}</Text>
            <Text style={[styles.badge, { color: "#10b981" }]}>Status: {item.status}</Text>
            <Text style={styles.meta}>Created: {new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
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
  badge: { marginTop: 4, color: "#0f172a", fontWeight: "600" },
  meta: { color: "#475569", marginTop: 2, fontSize: 12 },
  error: { color: "#dc2626", marginBottom: 8 }
});
