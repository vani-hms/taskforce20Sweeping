import React from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation";
import SweepingResHome from "./SweepingResHome";
import SweepingComHome from "./SweepingComHome";
import TwinbinHome from "./TwinbinHome";
import TaskforceHome from "./TaskforceHome";
import { useAuthContext } from "../../auth/AuthProvider";
import { View, Text } from "react-native";

type Props = NativeStackScreenProps<RootStackParamList, "Module">;

export default function ModuleHomeWrapper({ route, navigation }: Props) {
  const { moduleKey } = route.params;
  const key = moduleKey.toUpperCase();
  const { auth } = useAuthContext();
  const assignments = auth.status === "authenticated" ? auth.modules || [] : [];
  const assigned = assignments.find((m) => m.key === key);

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

  if (key === "SWEEP_RES") return <SweepingResHome navigation={navigation} />;
  if (key === "SWEEP_COM") return <SweepingComHome navigation={navigation} />;
  if (key === "TWINBIN") return <TwinbinHome navigation={navigation} />;
  return <TaskforceHome navigation={navigation} />;
}
