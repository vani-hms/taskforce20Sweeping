import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function QcSweepingHome() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ padding: 20, gap: 16 }}>

      <TouchableOpacity
        style={{ backgroundColor: "#2563eb", padding: 14 }}
        onPress={() => navigation.navigate("QcBeatAssignment")}
      >
        <Text style={{ color: "white" }}>Assign Beats</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: "#2563eb", padding: 14 }}
        onPress={() => navigation.navigate("QcSweepingList")}
      >
        <Text style={{ color: "white" }}>Sweeping Inspections</Text>
      </TouchableOpacity>

    </View>
  );
}
