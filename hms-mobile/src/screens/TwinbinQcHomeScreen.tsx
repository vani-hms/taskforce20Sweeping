import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcHome">;

export default function TwinbinQcHomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Twinbin - QC</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Bin Requests</Text>
        <Text style={styles.cardSubtitle}>Review and assign employees to new litter bin requests.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinQcPending")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Visit Reports</Text>
        <Text style={styles.cardSubtitle}>Approve or reject submitted visit questionnaires.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinVisitPending")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Bin Reports</Text>
        <Text style={styles.cardSubtitle}>Review submitted bin reports and take actions.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinReportPending")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mark Action Required</Text>
        <Text style={styles.cardSubtitle}>Use visit review to send items to Action Officer.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinVisitPending")}>
          <Text style={styles.buttonText}>Open Visits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#475569", marginVertical: 6 },
  button: {
    marginTop: 8,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" }
});
