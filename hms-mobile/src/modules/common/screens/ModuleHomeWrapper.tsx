import React, { useEffect, useRef } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { SweepingResHome, SweepingComHome } from "../../sweeping";
import { useAuthContext } from "../../../auth/AuthProvider";
import { View, Text, ActivityIndicator } from "react-native";
import { normalizeModuleKey } from "../moduleUtils";

type Props = NativeStackScreenProps<RootStackParamList, "Module">;

export default function ModuleHomeWrapper({ route, navigation }: Props) {
  const { moduleKey } = route.params;
  const key = normalizeModuleKey(moduleKey);

  const { auth } = useAuthContext();
  const hasRouted = useRef(false);

  const roles = auth.status === "authenticated" ? auth.roles || [] : [];
  const assignments = auth.status === "authenticated" ? auth.modules || [] : [];
  const assigned = assignments.find(m => normalizeModuleKey(m.key) === key);

  useEffect(() => {
    if (hasRouted.current) return;
    if (auth.status !== "authenticated") return;
    if (!assigned) return;

    const routeByModuleAndRole = () => {

      /* ================= EXISTING MODULES ================= */

      if (key === "LITTERBINS") {
        return roles.includes("QC") ? "TwinbinQcHome" : "TwinbinHome";
      }

      if (key === "TASKFORCE" || key === "CTU_GVP_TRANSFORMATION") {
        return roles.includes("QC") ? "TaskforceQcReports" : "TaskforceHome";
      }

      /* ================= SWEEPING ================= */

      if (key === "SWEEPING") {
        if (roles.includes("QC")) return "QcSweepingHome";
        if (roles.includes("ACTION_OFFICER")) return "ActionOfficerSweeping";
        return "SweepingBeats"; // Employee
      }

      return null;
    };

    const screen = routeByModuleAndRole();

    if (screen) {
      hasRouted.current = true;
      navigation.navigate(screen as never);
    }

  }, [auth.status, assigned, key, navigation, roles]);

  /* ============== LEGACY FALLBACKS (DO NOT REMOVE) ============== */

  if (key === "SWEEP_RES") return <SweepingResHome navigation={navigation} />;
  if (key === "SWEEP_COM") return <SweepingComHome navigation={navigation} />;

  /* ================= LOADING ================= */

  if (auth.status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f7fb" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Loading module...</Text>
      </View>
    );
  }

  /* ================= NOT ASSIGNED ================= */

  if (auth.status === "authenticated" && !assigned) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: "#f5f7fb"
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
          Module access required
        </Text>

        <Text style={{ color: "#4b5563", textAlign: "center" }}>
          You are not assigned to this module.
          {"\n"}Please contact City Admin.
        </Text>
      </View>
    );
  }

  return null;
}
