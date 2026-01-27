import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTwinbinActionRequired, ApiError } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinActionRequired">;

export default function TwinbinActionRequiredScreen({ navigation }: Props) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listTwinbinActionRequired();
      setVisits(res.visits || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load action required visits");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Action Required</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.muted}>No items.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("TwinbinActionRequiredDetail", { visit: item })}
          >
            <Text style={styles.cardTitle}>{item.bin?.areaName}</Text>
            <Text style={styles.muted}>{item.bin?.locationName}</Text>
            <Text style={styles.muted}>QC Remark: {item.qcRemark || "-"}</Text>
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
  error: { color: "#dc2626", marginBottom: 8 }
});
