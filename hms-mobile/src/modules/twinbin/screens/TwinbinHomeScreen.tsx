import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { MapPin, CheckCircle, ClipboardList, PlusCircle, LayoutGrid } from "lucide-react-native";
import { listTwinbinAssigned, listTwinbinPending, listTwinbinMyRequests } from "../../../api/auth";
import { useAuthContext } from "../../../auth/AuthProvider";
import TwinbinAdminDashboard from "./TwinbinAdminDashboard";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinHome">;

export default function TwinbinHomeScreen(props: Props) {
  const { auth } = useAuthContext();
  const isAdmin = auth.status === 'authenticated' &&
    (auth.user.roles.includes('CITY_ADMIN') || auth.user.roles.includes('ULB_OFFICER'));

  if (isAdmin) {
    return <TwinbinAdminDashboard />;
  }

  return <TwinbinEmployeeHome {...props} />;
}

function TwinbinEmployeeHome({ navigation }: Props) {
  const [stats, setStats] = useState({ assigned: 0, pending: 0, requests: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [assigned, pending, requests] = await Promise.all([
          listTwinbinAssigned().catch(() => ({ bins: [] })),
          listTwinbinPending().catch(() => ({ bins: [] })),
          listTwinbinMyRequests().catch(() => ({ bins: [] }))
        ]);
        setStats({
          assigned: assigned.bins?.length || 0,
          pending: pending.bins?.length || 0,
          requests: requests.bins?.length || 0
        });
      } catch (e) {
        // Silent fail for stats
      }
    };
    loadStats();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
      <Text style={styles.title}>Litter Bins</Text>
      <Text style={styles.subtitle}>Field Operations Workspace</Text>

      <View style={styles.kpiRow}>
        <Kpi label="Assigned" value={stats.assigned.toString()} color={Colors.primary} />
        <Kpi label="Pending" value={stats.pending.toString()} color={Colors.warning} />
        <Kpi label="My Requests" value={stats.requests.toString()} color={Colors.secondary} />
      </View>

      <View style={[Layout.card, { marginTop: Spacing.l }]}>
        <View style={styles.sectionHead}>
          <Text style={Typography.h2}>Actions</Text>
          <TouchableOpacity
            style={[UI.button, UI.buttonPrimary, { flexDirection: "row", gap: 6 }]}
            onPress={() => navigation.navigate("TwinbinRegister")}
          >
            <PlusCircle size={18} color={Colors.white} />
            <Text style={UI.buttonTextPrimary}>Register Bin</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: Spacing.m, marginTop: Spacing.m }}>
          <ActionCard
            title="Assigned Bins"
            desc="Inspect and report on your assigned bins."
            icon={<MapPin size={24} color={Colors.primary} />}
            onPress={() => navigation.navigate("TwinbinAssigned")}
            primary
          />
          <ActionCard
            title="My Requests"
            desc="Track status of your bin registrations."
            icon={<ClipboardList size={24} color={Colors.secondary} />}
            onPress={() => navigation.navigate("TwinbinMyRequests")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 4 }]}>
      <Text style={[Typography.h1, { color }]}>{value}</Text>
      <Text style={Typography.caption}>{label}</Text>
    </View>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  onPress,
  primary
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        primary && { backgroundColor: Colors.primaryLight + "40", borderColor: Colors.primaryLight }
      ]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={Typography.h3}>{title}</Text>
        <Text style={Typography.caption}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: Layout.screenContainer,
  title: { ...Typography.h1, color: Colors.primary },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: Spacing.l },
  kpiRow: { flexDirection: "row", gap: Spacing.m, justifyContent: "space-between" },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: 12,
    gap: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center"
  }
});
