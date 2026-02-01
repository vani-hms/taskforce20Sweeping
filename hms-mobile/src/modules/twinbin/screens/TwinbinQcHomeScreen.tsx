import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { ListChecks, FileText, AlertTriangle, CheckSquare } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcHome">;

export default function TwinbinQcHomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <Text style={styles.title}>Litter Bins · QC</Text>
      <Text style={styles.subtitle}>Quality Control Workspace</Text>

      <View style={styles.grid}>
        <View style={styles.col}>
          <QcCard
            title="Pending Bins"
            desc="Review new bin requests"
            icon={<ListChecks size={24} color={Colors.primary} />}
            onPress={() => navigation.navigate("TwinbinQcPending")}
            color={Colors.primary}
          />
        </View>
        <View style={styles.col}>
          <QcCard
            title="Pending Visits"
            desc="Visit reports review"
            icon={<FileText size={24} color={Colors.warning} />}
            onPress={() => navigation.navigate("TwinbinVisitPending")}
            color={Colors.warning}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: Spacing.m, marginTop: Spacing.m }}>
        <View style={styles.col}>
          <QcCard
            title="Approved Bins"
            desc="Assign employees to bins"
            icon={<ListChecks size={24} color={Colors.success} />}
            onPress={() => navigation.navigate("TwinbinQcApproved")}
            color={Colors.success}
          />
        </View>
        <View style={styles.col}>
          <QcCard
            title="Pending Reports"
            desc="Damage/Issue reports"
            icon={<AlertTriangle size={24} color={Colors.danger} />}
            onPress={() => navigation.navigate("TwinbinReportPending")}
            color={Colors.danger}
          />
        </View>
      </View>

      <View style={[Layout.card, { marginTop: Spacing.l }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.s, marginBottom: Spacing.s }}>
          <CheckSquare size={20} color={Colors.text} />
          <Text style={Typography.h3}>Quick Actions</Text>
        </View>
        <TouchableOpacity style={[UI.button, UI.buttonSecondary]} onPress={() => navigation.navigate("TwinbinVisitPending")}>
          <Text style={UI.buttonTextSecondary}>View All Visits</Text>
        </TouchableOpacity>
      </View>

    </ScrollView >
  );
}

function QcCard({ title, desc, icon, onPress, color, full }: any) {
  return (
    <TouchableOpacity
      style={[Layout.card, { borderLeftWidth: 4, borderLeftColor: color, height: full ? "auto" : 140, justifyContent: "space-between" }]}
      onPress={onPress}
    >
      <View>
        <View style={{ marginBottom: Spacing.s }}>{icon}</View>
        <Text style={Typography.h3}>{title}</Text>
      </View>
      <Text style={Typography.caption}>{desc}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: Layout.screenContainer,
  title: { ...Typography.h1, color: Colors.primary },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: Spacing.l },
  grid: { flexDirection: "row", gap: Spacing.m },
  col: { flex: 1 }
});
