import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { approveTwinbinVisit, rejectTwinbinVisit, ApiError, markTwinbinVisitActionRequired } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinVisitReview">;

export default function TwinbinVisitReviewScreen({ route, navigation }: Props) {
  const { visit } = route.params;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qcRemark, setQcRemark] = useState("");

  const act = async (action: "approve" | "reject") => {
    setSubmitting(true);
    setError("");
    try {
      if (action === "approve") await approveTwinbinVisit(visit.id);
      else await rejectTwinbinVisit(visit.id);
      Alert.alert("Success", `Visit ${action}d`, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const actionRequired = async () => {
    if (!qcRemark.trim()) {
      setError("QC remark is required for action required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await markTwinbinVisitActionRequired(visit.id, qcRemark);
      Alert.alert("Marked", "Action required set for this visit", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Visit Review</Text>
      <View style={styles.card}>
        <Row label="Employee" value={visit.submittedBy?.name || visit.submittedById} />
        <Row label="Bin" value={`${visit.bin?.areaName || ""} / ${visit.bin?.locationName || ""}`} />
        <Row label="Submitted" value={new Date(visit.createdAt).toLocaleString()} />
        <Row label="Distance" value={visit.distanceMeters ? `${visit.distanceMeters.toFixed(1)} m` : "-"} />
        <Row label="Lat/Lng" value={`${visit.latitude}, ${visit.longitude}`} />
      </View>
      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 8 }]}>Answers</Text>
        {(visit.inspectionAnswers ? Object.entries(visit.inspectionAnswers) : []).map(([key, val]: any) => (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={styles.label}>{questionText(key)}</Text>
            <Text style={styles.value}>Answer: {val?.answer || "-"}</Text>
            {val?.photoUrl ? <Image source={{ uri: val.photoUrl }} style={styles.preview} /> : <Text style={styles.value}>No photo</Text>}
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 8 }]}>QC Remark (for action required)</Text>
        <TextInput
          style={styles.input}
          value={qcRemark}
          onChangeText={setQcRemark}
          placeholder="Enter remark"
          multiline
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.reject]}
          onPress={() => act("reject")}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={actionRequired}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>Action Required</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.approve]}
          onPress={() => act("approve")}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.label, { marginTop: 12 }]}>QC Remark</Text>
      <View style={styles.card}>
        <Text style={styles.muted}>Add a remark if marking action required.</Text>
        <TouchableOpacity>
          <TextInput
            style={styles.input}
            value={qcRemark}
            onChangeText={setQcRemark}
            placeholder="Remark"
            multiline
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function questionText(key: string) {
  const map: Record<string, string> = {
    q1: "Are adequate litter bins provided in the area?",
    q2: "Are the litter bins properly fixed and securely installed?",
    q3: "Are the litter bins provided with lids/covers?",
    q4: "Is the ULB/Municipal logo or code clearly displayed?",
    q5: "Is waste found scattered around the litter bins?",
    q6: "Are any litter bins damaged or in poor condition?",
    q7: "Is an animal-proof locking mechanism provided?",
    q8: "Are the litter bins easily accessible to the public?",
    q9: "Are the litter bins being used properly by citizens?",
    q10: "Are the litter bins regularly cleaned and maintained?"
  };
  return map[key] || key;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  label: { color: "#475569", fontWeight: "600", marginRight: 8, flex: 1 },
  value: { color: "#0f172a", fontWeight: "600", flex: 1, textAlign: "right" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4
  },
  approve: { backgroundColor: "#16a34a" },
  reject: { backgroundColor: "#dc2626" },
  secondary: { backgroundColor: "#0ea5e9" },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#dc2626", marginTop: 8 },
  preview: { width: "100%", height: 160, marginTop: 6, borderRadius: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    color: "#0f172a"
  },
  muted: { color: "#64748b" }
});
