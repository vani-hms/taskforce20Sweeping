import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceHome">;

export default function TaskforceHomeScreen({ navigation }: { navigation: Nav }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Taskforce</Text>
      <Text style={styles.sub}>Stay on top of your assigned feeder points and submit daily reports.</Text>
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("TaskforceAssigned")}>
        <Text style={styles.cardTitle}>Assigned Feeder Points</Text>
        <Text style={styles.cardMeta}>View list · track distance · submit report</Text>
        <Text style={styles.cardLink}>Open →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#0f172a" },
  heading: { fontSize: 24, fontWeight: "700", color: "#f8fafc" },
  sub: { color: "#cbd5e1", marginTop: 6, marginBottom: 18, lineHeight: 20 },
  card: {
    backgroundColor: "#0b253a",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e3a8a"
  },
  cardTitle: { color: "#e2e8f0", fontSize: 18, fontWeight: "700" },
  cardMeta: { color: "#94a3b8", marginTop: 6 },
  cardLink: { color: "#38bdf8", fontWeight: "700", marginTop: 10 }
});
