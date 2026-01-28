import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinHome">;

export default function TwinbinHomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Litter Bins · Field Ops</Text>
      <Text style={styles.subtitle}>Your daily workspace for bin inspections and reporting.</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Assigned" value="—" />
        <Kpi label="Pending" value="—" />
        <Kpi label="Requests" value="—" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Primary Actions</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("TwinbinRegister")}>
            <Text style={styles.primaryBtnText}>+ Register Bin</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardGrid}>
          <ActionCard
            title="Assigned Bins"
            desc="Navigate to your assigned bins, capture location, and submit reports."
            onPress={() => navigation.navigate("TwinbinAssigned")}
            primary
          />
          <ActionCard
            title="My Requests"
            desc="Check statuses and follow up on bins you registered."
            onPress={() => navigation.navigate("TwinbinMyRequests")}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("TwinbinRegister")}>
        <Text style={styles.fabText}>＋</Text>
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
    <TouchableOpacity style={[styles.actionCard, primary && styles.actionCardPrimary]} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, primary && styles.cardTitleLight]}>{title}</Text>
        <Text style={[styles.cardSubtitle, primary && styles.cardSubtitleLight]}>{desc}</Text>
      </View>
      <Text style={[styles.linkText, primary && styles.cardSubtitleLight]}>Open ›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  subtitle: { color: "#475569", marginBottom: 16 },
  kpiRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0b1021",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  kpiLabel: { color: "#94a3b8", fontWeight: "600" },
  kpiValue: { color: "#e2e8f0", fontWeight: "800", fontSize: 22, marginTop: 4 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  primaryBtn: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  cardGrid: { gap: 12 },
  actionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  actionCardPrimary: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardTitleLight: { color: "#e2e8f0" },
  cardSubtitle: { color: "#475569", marginTop: 4 },
  cardSubtitleLight: { color: "#cbd5e1" },
  linkText: { color: "#1d4ed8", fontWeight: "700" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#16a34a",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: -2 }
});
