import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import * as Location from "expo-location";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation";
import { submitTaskforceReport } from "../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceFeederDetail">;
type Route = RouteProp<RootStackParamList, "TaskforceFeederDetail">;

type Props = { navigation: Nav; route: Route };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TaskforceFeederDetailScreen({ navigation, route }: Props) {
  const feeder = route.params.feeder;
  const [locationGranted, setLocationGranted] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [locError, setLocError] = useState("");
  const [notes, setNotes] = useState("");
  const [issuesFound, setIssuesFound] = useState<"YES" | "NO" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocError("Location permission is required to submit a report.");
        return;
      }
      setLocationGranted(true);
    };
    requestPermission();
  }, []);

  useEffect(() => {
    if (!locationGranted || !feeder?.latitude || !feeder?.longitude) return;
    (async () => {
      watcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, distanceInterval: 1, timeInterval: 2000 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          const d = haversineMeters(latitude, longitude, feeder.latitude!, feeder.longitude!);
          setDistance(d);
        }
      );
    })();
    return () => {
      watcher.current?.remove();
    };
  }, [locationGranted, feeder]);

  const withinFence = useMemo(() => (distance !== null ? distance <= 100 : false), [distance]);

  const submit = async () => {
    if (!withinFence) {
      Alert.alert("Out of range", "Move within 100 meters to submit a report.");
      return;
    }
    if (!issuesFound) {
      Alert.alert("Missing data", "Select whether issues were found.");
      return;
    }
    if (!coords) return;
    setSubmitting(true);
    try {
      await submitTaskforceReport(feeder.id, {
        latitude: coords.lat,
        longitude: coords.lng,
        payload: { notes, issuesFound }
      });
      Alert.alert("Submitted", "Report submitted for QC review.");
      setNotes("");
      setIssuesFound("");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.back} onPress={() => navigation.goBack()}>
        ← Back
      </Text>
      <Text style={styles.heading}>{feeder.feederPointName}</Text>
      <Text style={styles.muted}>{feeder.areaName} · {feeder.areaType}</Text>
      <Text style={styles.meta}>{feeder.locationDescription}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distance to feeder</Text>
        {distance === null ? (
          <ActivityIndicator color="#38bdf8" />
        ) : (
          <Text style={styles.distance}>{distance.toFixed(1)} m</Text>
        )}
        {!withinFence && (
          <Text style={styles.warning}>You must be within 100 meters to submit.</Text>
        )}
        {locError ? <Text style={styles.error}>{locError}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Report</Text>
        <Text style={styles.label}>Issues found?</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.pill, issuesFound === "YES" && styles.pillActive]}
            onPress={() => setIssuesFound("YES")}
          >
            <Text style={styles.pillText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, issuesFound === "NO" && styles.pillActive]}
            onPress={() => setIssuesFound("NO")}
          >
            <Text style={styles.pillText}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Add short notes"
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
        />
        <TouchableOpacity
          style={[styles.submitBtn, (!withinFence || submitting) && styles.submitDisabled]}
          onPress={submit}
          disabled={!withinFence || submitting}
        >
          <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#0f172a" },
  back: { color: "#38bdf8", marginBottom: 8, fontWeight: "600" },
  heading: { color: "#e2e8f0", fontSize: 22, fontWeight: "700" },
  muted: { color: "#94a3b8", marginTop: 4 },
  meta: { color: "#cbd5e1", marginTop: 6 },
  section: {
    backgroundColor: "#0b253a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    marginTop: 14
  },
  sectionTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  distance: { color: "#38bdf8", fontSize: 20, fontWeight: "700" },
  warning: { color: "#fbbf24", marginTop: 4 },
  error: { color: "#fca5a5", marginTop: 4 },
  label: { color: "#cbd5e1", marginTop: 10, marginBottom: 4 },
  row: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    backgroundColor: "#0f172a"
  },
  pillActive: { backgroundColor: "#1e3a8a" },
  pillText: { color: "#e2e8f0", fontWeight: "600" },
  textarea: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    padding: 12,
    color: "#e2e8f0",
    minHeight: 100,
    textAlignVertical: "top"
  },
  submitBtn: {
    marginTop: 14,
    backgroundColor: "#0ea5e9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: "#0f172a", fontWeight: "700", fontSize: 16 }
});
