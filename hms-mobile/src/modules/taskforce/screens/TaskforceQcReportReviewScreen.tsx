import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation";
import { approveTaskforceReport, rejectTaskforceReport, actionRequiredTaskforceReport, ApiError } from "../../../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceQcReportReview">;
type Route = RouteProp<RootStackParamList, "TaskforceQcReportReview">;

export default function TaskforceQcReportReviewScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { report } = route.params;
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const act = async (next: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
    setStatus(`Marking ${next.toLowerCase()}...`);
    setError("");
    try {
      if (next === "APPROVED") await approveTaskforceReport(report.id);
      else if (next === "REJECTED") await rejectTaskforceReport(report.id);
      else await actionRequiredTaskforceReport(report.id);
      Alert.alert("Updated", `Report ${next.toLowerCase()}.`, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
      setStatus("");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Report Detail</Text>
      <View style={styles.card}>
        <Row label="Feeder" value={report.feederPoint?.feederPointName} />
        <Row label="Area" value={report.feederPoint?.areaName} />
        <Row label="Employee" value={report.submittedBy?.name || "-"} />
        <Row label="Distance" value={`${(report.distanceMeters || 0).toFixed(1)} m`} />
        <Row label="Submitted" value={new Date(report.createdAt).toLocaleString()} />
      </View>
      <Text style={styles.subTitle}>Payload</Text>
      <View style={styles.code}>
        <Text style={styles.codeText}>{JSON.stringify(report.payload, null, 2)}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.muted}>{status}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.approve]} onPress={() => act("APPROVED")}>
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.warn]} onPress={() => act("ACTION_REQUIRED")}>
          <Text style={styles.buttonText}>Action Required</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.reject]} onPress={() => act("REJECTED")}>
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#475569", fontWeight: "600" },
  value: { color: "#0f172a", fontWeight: "600", marginLeft: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  button: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center", marginHorizontal: 4 },
  approve: { backgroundColor: "#16a34a" },
  warn: { backgroundColor: "#f59e0b" },
  reject: { backgroundColor: "#dc2626" },
  buttonText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#4b5563", marginTop: 8 },
  error: { color: "#dc2626", marginTop: 8 },
  code: { backgroundColor: "#0f172a", padding: 12, borderRadius: 10, marginTop: 8 },
  codeText: { color: "#e2e8f0", fontFamily: "monospace" }
});
