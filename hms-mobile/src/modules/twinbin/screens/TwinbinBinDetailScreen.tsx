import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, TextInput, Image, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../../navigation";
import { submitTwinbinReport, ApiError } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinBinDetail">;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TwinbinBinDetailScreen({ route }: Props) {
  const { bin } = route.params;
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const questions = [
    "Are adequate litter bins provided in the area?",
    "Are the litter bins properly fixed and securely installed?",
    "Are the litter bins provided with lids/covers?",
    "Is the ULB/Municipal logo or code clearly displayed?",
    "Is waste found scattered around the litter bins?",
    "Are any litter bins damaged or in poor condition?",
    "Is an animal-proof locking mechanism provided?",
    "Are the litter bins easily accessible to the public?",
    "Are the litter bins being used properly by citizens?",
    "Are the litter bins regularly cleaned and maintained?"
  ];
  const [answers, setAnswers] = useState<Record<string, { answer: "YES" | "NO" | ""; photoUrl: string }>>(
    Object.fromEntries(questions.map((_, idx) => [`q${idx + 1}`, { answer: "", photoUrl: "" }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchLocation = async () => {
    if (!bin.latitude || !bin.longitude) {
      setError("Bin location unavailable");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = haversineMeters(pos.coords.latitude, pos.coords.longitude, bin.latitude, bin.longitude);
      setDistance(dist);
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    } catch (err: any) {
      setError(err.message || "Failed to fetch location");
    } finally {
      setLoading(false);
    }
  };

  const withinFence = useMemo(() => (distance !== null ? distance <= 50 : false), [distance]);

  const submit = async () => {
    if (!withinFence || lat === null || lng === null) return;
    const missing = Object.values(answers).some((v) => !v.answer || !v.photoUrl);
    if (missing) {
      setSubmitError("All questions require an answer and photo.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitTwinbinReport(bin.id, {
        latitude: lat,
        longitude: lng,
        questionnaire: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [k, { answer: v.answer as "YES" | "NO", photoUrl: v.photoUrl }])
        )
      });
      Alert.alert("Submitted", "Report submitted, awaiting QC review.");
    } catch (err: any) {
      if (err instanceof ApiError) setSubmitError(err.message || "Failed to submit");
      else setSubmitError("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const setAnswer = (key: string, answer: "YES" | "NO") => {
    setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], answer } }));
  };

  const pickPhoto = async (key: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is needed to capture photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const dataUrl = asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri;
      setAnswers((prev) => ({ ...prev, [key]: { ...prev[key], photoUrl: dataUrl } }));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Bin Detail</Text>
      {bin.latestReport?.status ? (
        <Text style={[styles.badge]}>{`Report Status: ${bin.latestReport.status}`}</Text>
      ) : (
        <Text style={styles.muted}>Report not submitted yet.</Text>
      )}
      <View style={styles.card}>
        <Label label="Area" value={bin.areaName} />
        <Label label="Area Type" value={bin.areaType} />
        <Label label="Location" value={bin.locationName} />
        <Label label="Road Type" value={bin.roadType} />
        <Label label="Condition" value={bin.condition} />
        <Label label="Fixed Properly" value={bin.isFixedProperly ? "Yes" : "No"} />
        <Label label="Has Lid" value={bin.hasLid ? "Yes" : "No"} />
        <Label label="Latitude" value={bin.latitude?.toString() || "-"} />
        <Label label="Longitude" value={bin.longitude?.toString() || "-"} />
      </View>
      <TouchableOpacity style={styles.button} onPress={fetchLocation} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Fetch My Location</Text>}
      </TouchableOpacity>
      <Text style={styles.muted}>
        {distance === null ? "Distance not calculated" : `Distance: ${distance.toFixed(1)} m`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.muted}>
        {withinFence
          ? "You are within 50 meters. You can submit a report."
          : "You must be within 50 meters to submit a report."}
      </Text>
      <View style={[styles.card, { marginTop: 10 }]}>
        {questions.map((q, idx) => {
          const key = `q${idx + 1}`;
          const val = answers[key];
          return (
            <View key={key} style={styles.block}>
              <Text style={[styles.label, { marginBottom: 6 }]}>{q}</Text>
              <View style={styles.row}>
                <View style={styles.choice}>
                  <Text>Yes</Text>
                  <Switch value={val.answer === "YES"} onValueChange={(v) => setAnswer(key, v ? "YES" : "NO")} />
                </View>
                <View style={styles.choice}>
                  <Text>No</Text>
                  <Switch value={val.answer === "NO"} onValueChange={(v) => setAnswer(key, v ? "NO" : "YES")} />
                </View>
              </View>
              <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => pickPhoto(key)}>
                <Text style={styles.buttonText}>Capture Photo</Text>
              </TouchableOpacity>
              {val.photoUrl ? (
                <Image source={{ uri: val.photoUrl }} style={styles.preview} />
              ) : (
                <Text style={styles.muted}>Photo required</Text>
              )}
            </View>
          );
        })}
      </View>
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      <TouchableOpacity
        style={[styles.button, withinFence ? styles.buttonEnabled : styles.buttonDisabled]}
        onPress={submit}
        disabled={!withinFence || submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Label({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  block: { marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 6 },
  choice: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#475569", fontWeight: "600" },
  value: { color: "#0f172a", fontWeight: "600" },
  button: {
    marginTop: 10,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonEnabled: { backgroundColor: "#16a34a" },
  buttonDisabled: { backgroundColor: "#94a3b8" },
  buttonText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#4b5563", marginTop: 8 },
  error: { color: "#dc2626", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    marginTop: 6,
    textAlignVertical: "top"
  },
  preview: { width: "100%", height: 160, marginTop: 8, borderRadius: 8 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    color: "#075985",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    fontWeight: "700"
  }
});
