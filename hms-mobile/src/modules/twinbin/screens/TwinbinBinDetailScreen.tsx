import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView, Image, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../../navigation";
import { submitTwinbinReport, ApiError, getTwinbinReportContext } from "../../../api/auth";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { MapPin, Camera, Navigation, AlertCircle, CheckCircle } from "lucide-react-native";

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

export default function TwinbinBinDetailScreen({ route, navigation }: Props) {
  const { bin } = route.params;
  const [distance, setDistance] = useState<number | null>(null);
  const [proximityToken, setProximityToken] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [ctxMessage, setCtxMessage] = useState<string | null>(null);
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
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);

      try {
        const ctx = await getTwinbinReportContext(bin.id, pos.coords.latitude, pos.coords.longitude);
        setDistance(ctx.distanceMeters);
        setProximityToken(ctx.proximityToken);
        setAllowed(ctx.allowed);
        setCtxMessage(ctx.message || null);
        if (!ctx.allowed) {
          setError(ctx.message || "Move closer to the bin to submit.");
        } else {
          setError("");
        }
      } catch (ctxErr: any) {
        setAllowed(false);
        setProximityToken(null);
        setDistance(dist);
        if (ctxErr instanceof ApiError) setError(ctxErr.message || "Failed to verify proximity");
        else setError("Failed to verify proximity");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch location");
    } finally {
      setLoading(false);
    }
  };

  const withinFence = useMemo(() => allowed && distance !== null && distance <= 50, [allowed, distance]);

  const submit = async () => {
    if (!withinFence || lat === null || lng === null || !proximityToken) return;
    const missing = Object.values(answers).some((v) => !v.answer);
    if (missing) {
      setSubmitError("All questions need an answer (photos optional).");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitTwinbinReport(bin.id, {
        latitude: lat,
        longitude: lng,
        proximityToken: proximityToken!,
        questionnaire: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [k, { answer: v.answer as "YES" | "NO", photoUrl: v.photoUrl }])
        )
      });
      Alert.alert("Submitted", "Report submitted to QC", [
        { text: "OK", onPress: () => navigation.navigate("TwinbinAssigned") }
      ]);
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
    <ScrollView style={Layout.screenContainer} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <Text style={[Typography.h2, { color: Colors.primary }]}>Bin Detail</Text>

      {bin.latestReport?.status ? (
        <View style={styles.statusBadge}>
          <Text style={{ color: Colors.primary, fontWeight: "700" }}>Report Status: {bin.latestReport.status}</Text>
        </View>
      ) : (
        <Text style={Typography.muted}>No report submitted yet.</Text>
      )}

      <View style={[Layout.card, { marginTop: Spacing.m }]}>
        <LabelValue label="Area" value={bin.areaName} />
        <LabelValue label="Location" value={bin.locationName} />
        <LabelValue label="Condition" value={bin.condition} />
        <LabelValue label="Fixed" value={bin.isFixedProperly ? "Yes" : "No"} />
        <LabelValue label="Lid" value={bin.hasLid ? "Yes" : "No"} />
      </View>

      <View style={[Layout.card, { marginTop: Spacing.m }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={Typography.h3}>Verify Location</Text>
            <Text style={Typography.caption}>You must be within 50m</Text>
          </View>
          <TouchableOpacity onPress={fetchLocation} disabled={loading} style={[UI.button, UI.buttonSecondary, { paddingVertical: 8 }]}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : <Navigation size={20} color={Colors.primary} />}
          </TouchableOpacity>
        </View>

        <Text style={[Typography.body, { marginTop: Spacing.s }]}>
          {distance === null ? "Distance not calculated" : `Distance: ${distance.toFixed(1)} m`}
        </Text>

        {error ? <Text style={{ color: Colors.danger, marginTop: 4 }}>{error}</Text> : null}

        <Text style={{ marginTop: 4, color: withinFence ? Colors.success : Colors.textMuted }}>
          {withinFence ? "✅ You are within range." : ctxMessage || "Fetch location to check."}
        </Text>
      </View>

      {withinFence ? (
        <View style={{ marginTop: Spacing.l }}>
          <Text style={[Typography.h3, { marginBottom: Spacing.m }]}>Inspection Checklist</Text>
          {questions.map((q, idx) => {
            const key = `q${idx + 1}`;
            const val = answers[key];
            return (
              <View key={key} style={[Layout.card, { marginBottom: Spacing.m }]}>
                <Text style={[Typography.body, { marginBottom: Spacing.s, fontWeight: "600" }]}>{q}</Text>

                <View style={styles.choiceRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, val.answer === "YES" && styles.choiceSelectedYes]}
                    onPress={() => setAnswer(key, "YES")}
                  >
                    <Text style={[styles.choiceText, val.answer === "YES" && { color: Colors.white }]}>YES</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.choiceBtn, val.answer === "NO" && styles.choiceSelectedNo]}
                    onPress={() => setAnswer(key, "NO")}
                  >
                    <Text style={[styles.choiceText, val.answer === "NO" && { color: Colors.white }]}>NO</Text>
                  </TouchableOpacity>
                </View>

                {val.photoUrl ? (
                  <Image source={{ uri: val.photoUrl }} style={styles.preview} />
                ) : null}

                <TouchableOpacity style={styles.cameraBtn} onPress={() => pickPhoto(key)}>
                  <Camera size={16} color={Colors.primary} />
                  <Text style={{ color: Colors.primary, fontWeight: "600" }}>{val.photoUrl ? "Retake Photo" : "Add Photo"}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {submitError ? <Text style={{ color: Colors.danger, marginBottom: Spacing.s }}>{submitError}</Text> : null}

          <TouchableOpacity
            style={[UI.button, withinFence ? UI.buttonPrimary : styles.disabledBtn]}
            onPress={submit}
            disabled={!withinFence || submitting}
          >
            <Text style={UI.buttonTextPrimary}>{submitting ? "Submitting..." : "Submit Report"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[Typography.body, { color: Colors.textMuted }]}>{label}</Text>
      <Text style={[Typography.body, { fontWeight: "600" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 8
  },
  choiceRow: { flexDirection: "row", gap: Spacing.m, marginVertical: 8 },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center"
  },
  choiceSelectedYes: { backgroundColor: Colors.success, borderColor: Colors.success },
  choiceSelectedNo: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  choiceText: { fontWeight: "700", color: Colors.text },
  cameraBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  preview: { width: "100%", height: 160, borderRadius: 8, marginVertical: 8 },
  disabledBtn: { backgroundColor: Colors.textMuted, paddingVertical: 12, borderRadius: 8, alignItems: "center" }
});
