import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTwinbinReportsPending, ApiError } from "../../../api/auth";
import { useFocusEffect } from "@react-navigation/native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinReportPending">;

export default function TwinbinReportPendingScreen({ navigation }: Props) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listTwinbinReportsPending();
      setReports(res.reports || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
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
      <Text style={styles.title}>Pending Bin Reports</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!reports.length ? (
        <Text style={styles.muted}>No pending reports.</Text>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("TwinbinReportReview", { report: item })}
            >
              <Text style={styles.cardTitle}>{item.bin?.areaName}</Text>
              <Text style={styles.muted}>{item.bin?.locationName}</Text>
              <Text style={styles.muted}>{item.submittedBy?.name || "-"}</Text>
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
