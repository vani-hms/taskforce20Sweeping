import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import * as Location from "expo-location";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation";
import { submitTaskforceReport } from "../../../api/auth";

import TaskforceLayout from "../components/TaskforceLayout";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceFeederDetail">;
type Route = RouteProp<RootStackParamList, "TaskforceFeederDetail">;

type Props = { navigation: Nav; route: Route };

type Bool = "YES" | "NO" | "";

type QuestionnaireState = {
  wastePresent: Bool;
  segregationNotes: string;
  insidePhotos: string[];
  outsideWaste: Bool;
  outsidePhotos: string[];
  cleanRemark: string;
  workersPresent: Bool;
  workerCount: string;
  workerNames: string;
  workersPhoto: string;
  vehiclePresent: Bool;
  vehicleNumber: string;
  vehicleHelper: string;
  vehiclePhoto: string;
  surroundingCleanPhotos: string[];
  swdClean: Bool;
  swdPhotos: string[];
  signboardVisible: Bool;
  signboardPhoto: string;
  signboardRemark: string;
  thirdPartyDumping: Bool;
  dumpingPhoto: string;
  leachateVisible: Bool;
  leachatePhoto: string;
  strayAnimals: Bool;
  strayAnimalsPhoto: string;
};

const emptyPhotos = (n: number) => Array.from({ length: n }, () => "");

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
  const [submitting, setSubmitting] = useState(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [q, setQ] = useState<QuestionnaireState>({
    wastePresent: "",
    segregationNotes: "",
    insidePhotos: emptyPhotos(1),
    outsideWaste: "",
    outsidePhotos: emptyPhotos(1),
    cleanRemark: "",
    workersPresent: "",
    workerCount: "",
    workerNames: "",
    workersPhoto: "",
    vehiclePresent: "",
    vehicleNumber: "",
    vehicleHelper: "",
    vehiclePhoto: "",
    surroundingCleanPhotos: emptyPhotos(3),
    swdClean: "",
    swdPhotos: emptyPhotos(1),
    signboardVisible: "",
    signboardPhoto: "",
    signboardRemark: "",
    thirdPartyDumping: "",
    dumpingPhoto: "",
    leachateVisible: "",
    leachatePhoto: "",
    strayAnimals: "",
    strayAnimalsPhoto: ""
  });

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

  const update = (field: keyof QuestionnaireState, value: any) => setQ((prev) => ({ ...prev, [field]: value }));

  const updatePhotoArray = (field: keyof QuestionnaireState, idx: number, value: string) => {
    setQ((prev) => {
      const arr = [...(prev[field] as string[])];
      arr[idx] = value;
      return { ...prev, [field]: arr } as QuestionnaireState;
    });
  };

  const validate = () => {
    if (!withinFence) {
      Alert.alert("Out of range", "Move within 100 meters to submit.");
      return false;
    }
    if (!q.wastePresent) return alertMissing("Q1: waste present");
    if (q.wastePresent === "YES" && !q.insidePhotos[0]) return alertMissing("Q1: upload inside photo");
    if (q.wastePresent === "YES" && q.outsideWaste === "YES" && !q.outsidePhotos[0]) return alertMissing("Q1: outside waste photo");
    if (q.wastePresent === "NO" && !q.cleanRemark) return alertMissing("Q1: remark (area clean)");

    if (!q.workersPresent) return alertMissing("Q2: worker presence");
    if (q.workersPresent === "YES" && !q.workerCount) return alertMissing("Q2: worker count");
    if (q.workersPresent === "YES" && !q.workerNames) return alertMissing("Q2: worker names");
    if (q.workersPresent === "NO" && !q.workersPhoto) return alertMissing("Q2: worker absence photo");

    if (!q.vehiclePresent) return alertMissing("Q3: vehicle presence");
    if (q.vehiclePresent === "YES" && !q.vehicleNumber) return alertMissing("Q3: vehicle number");
    if (q.vehiclePresent === "YES" && !q.vehicleHelper) return alertMissing("Q3: helper details");
    if (q.vehiclePresent === "NO" && !q.vehiclePhoto) return alertMissing("Q3: vehicle absence photo");

    if (q.surroundingCleanPhotos.some((p) => !p)) return alertMissing("Q4: 3 surrounding area photos");

    if (!q.swdClean) return alertMissing("Q5: SWD clean status");
    if (!q.swdPhotos[0]) return alertMissing("Q5: SWD photo");

    if (!q.signboardVisible) return alertMissing("Q6: signboard visibility");
    if (!q.signboardPhoto) return alertMissing("Q6: signboard photo");

    if (!q.thirdPartyDumping) return alertMissing("Q7: dumping observed");
    if (q.thirdPartyDumping === "YES" && !q.dumpingPhoto) return alertMissing("Q7: dumping photo");

    if (!q.leachateVisible) return alertMissing("Q8: leachate visibility");
    if (!q.leachatePhoto) return alertMissing("Q8: leachate photo");

    if (!q.strayAnimals) return alertMissing("Q9: stray animals");
    if (!q.strayAnimalsPhoto) return alertMissing("Q9: stray animals photo");

    return true;
  };

  const alertMissing = (msg: string) => {
    Alert.alert("Incomplete", msg);
    return false;
  };

  const submit = async () => {
    if (!coords) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        q1: {
          wastePresent: q.wastePresent === "YES",
          segregationNotes: q.segregationNotes,
          insidePhotos: q.insidePhotos,
          outsideWaste: q.outsideWaste === "YES",
          outsidePhotos: q.outsidePhotos,
          cleanRemark: q.cleanRemark
        },
        q2: {
          workersPresent: q.workersPresent === "YES",
          workerCount: q.workerCount,
          workerNames: q.workerNames,
          workersPhoto: q.workersPhoto
        },
        q3: {
          vehiclePresent: q.vehiclePresent === "YES",
          vehicleNumber: q.vehicleNumber,
          vehicleHelper: q.vehicleHelper,
          vehiclePhoto: q.vehiclePhoto
        },
        q4: {
          surroundingCleanPhotos: q.surroundingCleanPhotos
        },
        q5: {
          swdClean: q.swdClean === "YES",
          swdPhotos: q.swdPhotos
        },
        q6: {
          signboardVisible: q.signboardVisible === "YES",
          signboardPhoto: q.signboardPhoto,
          signboardRemark: q.signboardRemark
        },
        q7: {
          thirdPartyDumping: q.thirdPartyDumping === "YES",
          dumpingPhoto: q.dumpingPhoto
        },
        q8: {
          leachateVisible: q.leachateVisible === "YES",
          leachatePhoto: q.leachatePhoto
        },
        q9: {
          strayAnimals: q.strayAnimals === "YES",
          strayAnimalsPhoto: q.strayAnimalsPhoto
        }
      };

      await submitTaskforceReport(feeder.id, {
        latitude: coords.lat,
        longitude: coords.lng,
        payload
      });
      Alert.alert("Submitted", "Report submitted for QC review.");
      setQ((prev) => ({ ...prev, wastePresent: "", workersPresent: "", vehiclePresent: "", swdClean: "", signboardVisible: "", thirdPartyDumping: "", leachateVisible: "", strayAnimals: "" } as QuestionnaireState));
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TaskforceLayout
      title={feeder.feederPointName}
      subtitle={`${feeder.areaName} - ${feeder.areaType}`}
      navigation={navigation}
      showBack={true}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.meta}>{feeder.locationDescription}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance to feeder</Text>
          {distance === null ? <ActivityIndicator color="#38bdf8" /> : <Text style={styles.distance}>{distance.toFixed(1)} m</Text>}
          {!withinFence && <Text style={styles.warning}>You must be within 100 meters to submit.</Text>}
          {locError ? <Text style={styles.error}>{locError}</Text> : null}
        </View>

        {/* Questionnaire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taskforce Questionnaire</Text>

          {/* Q1 */}
          <RadioRow
            label="Q1. Is there any waste present at the SCP?"
            value={q.wastePresent}
            onChange={(v) => update("wastePresent", v)}
          />
          {q.wastePresent === "YES" && (
            <>
              <Text style={styles.label}>Segregation / notes</Text>
              <TextInput style={styles.input} value={q.segregationNotes} onChangeText={(t) => update("segregationNotes", t)} />
              <PhotoInput label="Inside waste photo" value={q.insidePhotos[0]} onChange={(t) => updatePhotoArray("insidePhotos", 0, t)} />
              <RadioRow label="Outside waste present?" value={q.outsideWaste} onChange={(v) => update("outsideWaste", v)} />
              {q.outsideWaste === "YES" && (
                <PhotoInput label="Outside waste photo" value={q.outsidePhotos[0]} onChange={(t) => updatePhotoArray("outsidePhotos", 0, t)} />
              )}
            </>
          )}
          {q.wastePresent === "NO" && (
            <>
              <PhotoInput label="Area clean photo" value={q.insidePhotos[0]} onChange={(t) => updatePhotoArray("insidePhotos", 0, t)} />
              <Text style={styles.label}>Remark</Text>
              <TextInput style={styles.input} value={q.cleanRemark} onChangeText={(t) => update("cleanRemark", t)} />
            </>
          )}

          {/* Q2 */}
          <RadioRow
            label="Q2. Are Swachh workers present?"
            value={q.workersPresent}
            onChange={(v) => update("workersPresent", v)}
          />
          {q.workersPresent === "YES" && (
            <>
              <Text style={styles.label}>Worker count</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={q.workerCount} onChangeText={(t) => update("workerCount", t)} />
              <Text style={styles.label}>Worker names</Text>
              <TextInput style={styles.input} value={q.workerNames} onChangeText={(t) => update("workerNames", t)} />
            </>
          )}
          {q.workersPresent === "NO" && (
            <PhotoInput label="Photo (no workers present)" value={q.workersPhoto} onChange={(t) => update("workersPhoto", t)} />
          )}

          {/* Q3 */}
          <RadioRow label="Q3. Is PMC waste vehicle present?" value={q.vehiclePresent} onChange={(v) => update("vehiclePresent", v)} />
          {q.vehiclePresent === "YES" && (
            <>
              <Text style={styles.label}>Vehicle number</Text>
              <TextInput style={styles.input} value={q.vehicleNumber} onChangeText={(t) => update("vehicleNumber", t)} />
              <Text style={styles.label}>Helper details</Text>
              <TextInput style={styles.input} value={q.vehicleHelper} onChangeText={(t) => update("vehicleHelper", t)} />
            </>
          )}
          {q.vehiclePresent === "NO" && (
            <PhotoInput label="Photo (vehicle not present)" value={q.vehiclePhoto} onChange={(t) => update("vehiclePhoto", t)} />
          )}

          {/* Q4 */}
          <Text style={styles.label}>Q4. Surrounding area (30m) clean? Upload 3 photos</Text>
          {q.surroundingCleanPhotos.map((p, idx) => (
            <PhotoInput key={idx} label={`Photo ${idx + 1}`} value={p} onChange={(t) => updatePhotoArray("surroundingCleanPhotos", idx, t)} />
          ))}

          {/* Q5 */}
          <RadioRow label="Q5. Is SWD clean?" value={q.swdClean} onChange={(v) => update("swdClean", v)} />
          <PhotoInput label="SWD photo" value={q.swdPhotos[0]} onChange={(t) => updatePhotoArray("swdPhotos", 0, t)} />

          {/* Q6 */}
          <RadioRow label="Q6. Is SCP signboard/QR visible?" value={q.signboardVisible} onChange={(v) => update("signboardVisible", v)} />
          <PhotoInput label="Signboard/QR photo" value={q.signboardPhoto} onChange={(t) => update("signboardPhoto", t)} />
          <Text style={styles.label}>Remarks</Text>
          <TextInput style={styles.input} value={q.signboardRemark} onChangeText={(t) => update("signboardRemark", t)} />

          {/* Q7 */}
          <RadioRow label="Q7. Third-party dumping observed?" value={q.thirdPartyDumping} onChange={(v) => update("thirdPartyDumping", v)} />
          {q.thirdPartyDumping === "YES" && (
            <PhotoInput label="Dumping photo" value={q.dumpingPhoto} onChange={(t) => update("dumpingPhoto", t)} />
          )}

          {/* Q8 */}
          <RadioRow label="Q8. Leachate visible?" value={q.leachateVisible} onChange={(v) => update("leachateVisible", v)} />
          <PhotoInput label="Leachate photo" value={q.leachatePhoto} onChange={(t) => update("leachatePhoto", t)} />

          {/* Q9 */}
          <RadioRow label="Q9. Stray animals present?" value={q.strayAnimals} onChange={(v) => update("strayAnimals", v)} />
          <PhotoInput label="Stray animals photo" value={q.strayAnimalsPhoto} onChange={(t) => update("strayAnimalsPhoto", t)} />

          <TouchableOpacity
            style={[styles.submitBtn, (!withinFence || submitting) && styles.submitDisabled]}
            onPress={submit}
            disabled={!withinFence || submitting}
          >
            <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit for QC"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TaskforceLayout>
  );
}

function RadioRow({ label, value, onChange }: { label: string; value: Bool; onChange: (v: Bool) => void }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity style={[styles.pill, value === "YES" && styles.pillActive]} onPress={() => onChange("YES")}>
          <Text style={[styles.pillText, value === "YES" && styles.pillTextActive]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.pill, value === "NO" && styles.pillActive]} onPress={() => onChange("NO")}>
          <Text style={[styles.pillText, value === "NO" && styles.pillTextActive]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PhotoInput({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder="Photo URL"
        placeholderTextColor="#64748b"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  back: { color: "#1d4ed8", marginBottom: 8, fontWeight: "600" },
  heading: { color: "#0f172a", fontSize: 22, fontWeight: "700" },
  muted: { color: "#64748b", marginTop: 4 },
  meta: { color: "#475569", marginTop: 6 },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2
  },
  sectionTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  distance: { color: "#1d4ed8", fontSize: 20, fontWeight: "700" },
  warning: { color: "#d97706", marginTop: 4, fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 4 },
  label: { color: "#475569", marginTop: 10, marginBottom: 4, fontWeight: "600" },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9"
  },
  pillActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  pillText: { color: "#475569", fontWeight: "600" },
  pillTextActive: { color: "#ffffff" },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    color: "#0f172a"
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#ffffff", fontWeight: "700", fontSize: 16 }
});
