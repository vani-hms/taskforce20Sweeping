import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Layout, Typography } from "../../../theme";

export default function QcSweepingHome() {
  const navigation = useNavigation<any>();

  return (
    <View style={[Layout.screenContainer, { gap: 16 }]}>

      {/* HEADER */}
      <Text style={Typography.h2}>QC Dashboard</Text>
      <Text style={{ color: "#6b7280", marginBottom: 6 }}>
        Quality Control – Sweeping Module
      </Text>

      <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 10 }}>
        Assign beats, review inspections and escalate actions
      </Text>

      {/* ASSIGN BEATS */}
      <TouchableOpacity
        style={[
          Layout.card,
          {
            backgroundColor: "#eff6ff",
            borderLeftWidth: 5,
            borderLeftColor: "#2563eb",
            paddingVertical: 20
          }
        ]}
        onPress={() => navigation.navigate("QcBeatAssignment")}
      >
        <Text style={{ fontWeight: "700", fontSize: 16 }}>
          📍 Assign Beats
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 6 }}>
          Allocate beats to field employees
        </Text>

        <Text style={{ marginTop: 6, fontSize: 12, color: "#2563eb" }}>
          Tap to assign →
        </Text>
      </TouchableOpacity>

      {/* REVIEW INSPECTIONS */}
      <TouchableOpacity
        style={[
          Layout.card,
          {
            backgroundColor: "#f0fdf4",
            borderLeftWidth: 5,
            borderLeftColor: "#22c55e",
            paddingVertical: 20
          }
        ]}
        onPress={() => navigation.navigate("QcSweepingList")}
      >
        <Text style={{ fontWeight: "700", fontSize: 16 }}>
          🧹 Inspection Queue
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 6 }}>
          Review submitted inspections and take decisions
        </Text>

        <Text style={{ marginTop: 6, fontSize: 12, color: "#22c55e" }}>
          Open queue →
        </Text>
      </TouchableOpacity>

      {/* OPTIONAL FUTURE CARD */}
      <View
        style={[
          Layout.card,
          {
            backgroundColor: "#fff7ed",
            borderLeftWidth: 5,
            borderLeftColor: "#f59e0b",
            paddingVertical: 18
          }
        ]}
      >
        <Text style={{ fontWeight: "700", fontSize: 15 }}>
          ⚠ Action Required
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 6 }}>
          Inspections pending field action
        </Text>

        <Text style={{ marginTop: 6, fontSize: 12, color: "#f59e0b" }}>
          (Coming from inspection decisions)
        </Text>
      </View>

    </View>
  );
}
