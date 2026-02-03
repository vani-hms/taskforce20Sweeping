import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTaskforceAssigned } from "../../../api/auth";
import TaskforceLayout from "../components/TaskforceLayout";
import { MapPin, Calendar, ArrowRight } from "lucide-react-native";

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
      <View style={styles.cardHeader}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{item.feederPointName}</Text>
          <Text style={styles.areaInfo}>{item.areaName} • {item.areaType}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <MapPin size={14} color="#64748b" />
          <Text style={styles.metaText} numberOfLines={1}>{item.locationDescription}</Text>
        </View>
        <View style={styles.metaRow}>
          <Calendar size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString() : "-"}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerAction}>View Details</Text>
        <ArrowRight size={16} color="#0f172a" />
      </View>
    </TouchableOpacity>
  );

  return (
    <TaskforceLayout
      title="Assigned Feeders"
      subtitle="Select a point to start survey"
      navigation={navigation}
      showBack={true}
    >
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator color="#0f172a" size="large" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : feeders.length === 0 ? (
          <Text style={styles.muted}>No feeder points assigned.</Text>
        ) : (
          <FlatList
            data={feeders}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          />
        )}
      </View>
    </TaskforceLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleGroup: {
    flex: 1,
    marginRight: 8,
  },
  title: { color: "#0f172a", fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  areaInfo: { color: "#64748b", fontSize: 13, marginTop: 2, fontWeight: "500" },
  statusBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: "#475569", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: { color: "#475569", fontSize: 13, fontWeight: "500" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 4,
  },
  footerAction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  muted: { color: "#64748b", textAlign: "center", marginTop: 40, fontSize: 15 },
  error: { color: "#dc2626", textAlign: "center", marginTop: 20, fontWeight: "600" }
});
