import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceHome">;

export default function TaskforceHomeScreen({ navigation }: { navigation: Nav }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>CTU / GVP Transformation</Text>
      <Text style={styles.sub}>Map-first workspace for feeder points and rapid reporting.</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Assigned" value="—" />
        <Kpi label="Pending QC" value="—" />
        <Kpi label="My Requests" value="—" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Primary Actions</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("TaskforceRegister")}>
            <Text style={styles.primaryBtnText}>+ Request Feeder</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardGrid}>
          <ActionCard
            title="Assigned Feeders"
            desc="Open nearest points, check distance, and submit reports."
            onPress={() => navigation.navigate("TaskforceAssigned")}
            primary
          />
          <ActionCard
            title="My Requests"
            desc="Track approvals and follow-ups on your submissions."
            onPress={() => navigation.navigate("TaskforceMyRequests")}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("TaskforceAssigned")}>
        <Text style={styles.fabText}>▶</Text>
      </TouchableOpacity>
    </View>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function ActionCard({
  title,
  desc,
  onPress,
  primary
}: {
  title: string;
  desc: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.actionCard, primary && styles.actionPrimary]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, primary && styles.cardTitleLight]}>{title}</Text>
        <Text style={[styles.cardMeta, primary && styles.cardMetaLight]}>{desc}</Text>
      </View>
      <Text style={[styles.cardLink, primary && styles.cardMetaLight]}>Open ›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  heading: { fontSize: 24, fontWeight: "800", color: "#f8fafc" },
  sub: { color: "#cbd5e1", marginTop: 6, marginBottom: 18, lineHeight: 20 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0b253a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e3a8a"
  },
  kpiLabel: { color: "#94a3b8", fontWeight: "600" },
  kpiValue: { color: "#e2e8f0", fontWeight: "800", fontSize: 22, marginTop: 4 },
  section: {
    backgroundColor: "#0b253a",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    marginTop: 18
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: "#e2e8f0", fontSize: 18, fontWeight: "700" },
  primaryBtn: { backgroundColor: "#22c55e", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primaryBtnText: { color: "#0b253a", fontWeight: "800" },
  cardGrid: { gap: 12 },
  actionCard: {
    backgroundColor: "#102a43",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  actionPrimary: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  cardTitle: { color: "#e2e8f0", fontSize: 17, fontWeight: "700" },
  cardTitleLight: { color: "#f8fafc" },
  cardMeta: { color: "#94a3b8", marginTop: 4 },
  cardMetaLight: { color: "#dbeafe" },
  cardLink: { color: "#60a5fa", fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 24,
    backgroundColor: "#22c55e",
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center"
  },
  fabText: { color: "#0f172a", fontSize: 22, fontWeight: "800" }
});
