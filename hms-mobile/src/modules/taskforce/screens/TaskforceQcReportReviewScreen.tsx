import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, FlatList, Image, Modal } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation";
import { approveTaskforceReport, rejectTaskforceReport, actionRequiredTaskforceReport, ApiError } from "../../../api/auth";

import TaskforceLayout from "../components/TaskforceLayout";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceQcReportReview">;
type Route = RouteProp<RootStackParamList, "TaskforceQcReportReview">;

export default function TaskforceQcReportReviewScreen({ navigation, route }: { navigation: Nav; route: Route }) {
  const { report } = route.params;
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

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

  const questions = Object.entries(report.payload || {}).map(([key, value]) => ({
    key,
    label: key.toUpperCase(),
    answer: (value as any)?.answer,
    photoUrl: (value as any)?.photoUrl
  }));

  return (
    <TaskforceLayout
      title="Review Report"
      subtitle={report.feederPoint?.feederPointName}
      navigation={navigation}
      showBack={true}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.card}>
          <Row label="Feeder" value={report.feederPoint?.feederPointName} />
          <Row label="Area" value={report.feederPoint?.areaName} />
          <Row label="Employee" value={report.submittedBy?.name || "-"} />
          <Row label="Distance" value={`${(report.distanceMeters || 0).toFixed(1)} m`} />
          <Row label="Submitted" value={new Date(report.createdAt).toLocaleString()} />
        </View>
        <Text style={styles.subTitle}>Questionnaire</Text>
        <FlatList
          data={questions}
          keyExtractor={(item) => item.key}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <View style={styles.qCard}>
              <View style={styles.qHeader}>
                <Text style={styles.qLabel}>{item.label}</Text>
                <View style={[styles.chip, item.answer === "YES" ? styles.chipYes : styles.chipNo]}>
                  <Text style={styles.chipText}>{item.answer || "N/A"}</Text>
                </View>
              </View>
              {item.photoUrl ? (
                <TouchableOpacity onPress={() => setPreview(item.photoUrl)} style={styles.thumbWrap}>
                  <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
                  <Text style={styles.muted}>Tap to view</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.muted}>No photo provided</Text>
              )}
            </View>
          )}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? <Text style={styles.muted}>{status}</Text> : null}
        <View style={[styles.row, styles.stickyActions]}>
          <TouchableOpacity style={[styles.button, styles.approve]} onPress={() => act("APPROVED")} disabled={!!status}>
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.warn]} onPress={() => act("ACTION_REQUIRED")} disabled={!!status}>
            <Text style={styles.buttonText}>Action Required</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.reject]} onPress={() => act("REJECTED")} disabled={!!status}>
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setPreview(null)}>
              {preview ? <Image source={{ uri: preview }} style={styles.fullImage} /> : null}
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </TaskforceLayout>
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
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 16 },
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
  qCard: { backgroundColor: "#fff", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qLabel: { fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipYes: { backgroundColor: "#dcfce7" },
  chipNo: { backgroundColor: "#fee2e2" },
  chipText: { fontWeight: "700", color: "#0f172a" },
  thumbWrap: { marginTop: 8 },
  thumb: { width: "100%", height: 180, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "90%", height: "70%", resizeMode: "contain", borderRadius: 12 },
  stickyActions: { position: "relative", marginTop: 16 }
});
