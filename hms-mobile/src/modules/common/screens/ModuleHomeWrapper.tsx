import React, { useEffect, useRef } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { useAuthContext } from "../../../auth/AuthProvider";
import { View, Text, ActivityIndicator } from "react-native";
import { normalizeModuleKey } from "../moduleUtils";

type Props = NativeStackScreenProps<RootStackParamList, "Module">;

export default function ModuleHomeWrapper({ route, navigation }: Props) {
  const { moduleKey } = route.params;
  const key = normalizeModuleKey(moduleKey);
  const { auth } = useAuthContext();

  const roles = auth.status === "authenticated" ? auth.roles || [] : [];
  const assignments = auth.status === "authenticated" ? auth.modules || [] : [];
  const assigned = assignments.find(m => normalizeModuleKey(m.key) === key);

  const hasRouted = useRef(false);

  useEffect(() => {
    if (hasRouted.current || !assigned) return;

    hasRouted.current = true;

    if (key === "LITTERBINS") {
      navigation.replace(roles.includes("QC") ? "TwinbinQcHome" : "TwinbinHome");
      return;
    }

    if (key === "TASKFORCE" || key === "CTU_GVP_TRANSFORMATION") {
      navigation.replace(roles.includes("QC") ? "TaskforceQcReports" : "TaskforceHome");
      return;
    }

    if (key === "TOILET") {
      navigation.replace(roles.includes("QC") ? "ToiletQcTabs" : "ToiletEmployeeTabs");
      return;
    }

    if (key === "SWEEPING") {
      navigation.replace(roles.includes("QC") ? "QcSweepingHome" : "SweepingBeats");
      return;
    }
  }, [assigned, key, navigation, roles]);




  /* ROUTING LOADER */

  if (auth.status === "loading" || hasRouted.current) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loading}>Opening module…</Text>
      </View>
    );
  }

  /* ACCESS DENIED */

  if (!assigned) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Access Required</Text>
        <Text style={styles.sub}>
          You are not assigned to this module.
          Please contact City Admin.
        </Text>
      </View>
    );
  }

  return null;
}

const styles = {
  center: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 24
  },
  loading: {
    marginTop: 12,
    fontWeight: "600" as const,
    color: "#2563eb"
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6
  },
  sub: {
    color: "#4b5563",
    textAlign: "center" as const,
    lineHeight: 20
  }
};
