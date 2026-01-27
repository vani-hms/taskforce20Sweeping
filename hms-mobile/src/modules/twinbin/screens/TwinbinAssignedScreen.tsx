import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listTwinbinAssigned, ApiError } from "../../../api/auth";
import { RootStackParamList } from "../../../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinAssigned">;

export default function TwinbinAssignedScreen({ navigation }: Props) {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listTwinbinAssigned();
      setBins(res.bins || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load assigned bins");
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
      <Text style={styles.title}>Assigned Twinbin Bins</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!bins.length ? (
        <Text style={styles.muted}>No bins assigned to you.</Text>
      ) : (
        <FlatList
          data={bins}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("TwinbinBinDetail", { bin: item })}>
              <Text style={styles.cardTitle}>{item.areaName}</Text>
              <Text style={styles.muted}>{item.locationName}</Text>
              <Text style={styles.muted}>Condition: {item.condition}</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  error: { color: "#dc2626", marginBottom: 8 },
  meta: { color: "#475569", marginTop: 4, fontSize: 12 }
});
