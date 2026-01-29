import React, { useEffect, useRef } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { SweepingResHome, SweepingComHome } from "../../sweeping";
import { useAuthContext } from "../../../auth/AuthProvider";
import { View, Text } from "react-native";
import { normalizeModuleKey } from "../moduleUtils";

type Props = NativeStackScreenProps<RootStackParamList, "Module">;

export default function ModuleHomeWrapper({ route, navigation }: Props) {
  const { moduleKey } = route.params;
  const key = normalizeModuleKey(moduleKey);
  const { auth } = useAuthContext();
  const roles = auth.status === "authenticated" ? auth.roles || [] : [];
  const assignments = auth.status === "authenticated" ? auth.modules || [] : [];
  const assigned = assignments.find((m) => normalizeModuleKey(m.key) === key);
  const hasRouted = useRef(false);

  useEffect(() => {
    if (hasRouted.current) return;
    if (!assigned) return;

    if (key === "LITTERBINS") {
      hasRouted.current = true;
      navigation.navigate(roles.includes("QC") ? "TwinbinQcHome" : "TwinbinHome");
      return;
    }
    if (key === "TASKFORCE") {
      hasRouted.current = true;
      navigation.navigate(roles.includes("QC") ? "TaskforceQcReports" : "TaskforceHome");
      return;
    }
    if (key === "CTU_GVP_TRANSFORMATION") {
      hasRouted.current = true;
      navigation.navigate(roles.includes("QC") ? "TaskforceQcReports" : "TaskforceHome");
      return;
    }
  }, [assigned, key, navigation, roles]);

  if (key === "SWEEP_RES") return <SweepingResHome navigation={navigation} />;
  if (key === "SWEEP_COM") return <SweepingComHome navigation={navigation} />;

  if (hasRouted.current) return null;
  if (auth.status === "Loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  if (!assigned) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f5f7fb" }}>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>Module access required</Text>
        <Text style={{ color: "#4b5563", textAlign: "center" }}>
          You are not assigned to this module. Please check with your administrator.
        </Text>
      </View>
    );
  }

  return null;
}
