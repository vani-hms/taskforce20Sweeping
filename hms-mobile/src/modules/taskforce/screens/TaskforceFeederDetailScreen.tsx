import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../../navigation";
import { submitTaskforceReport } from "../../../api/auth";
import { API_BASE_URL } from "../../../api/baseUrl";
import { getToken } from "../../../auth/storage";
import { Camera, Image as ImageIcon, X, Plus, Ban } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  const addPhotoToArray = (field: keyof QuestionnaireState, value: string) => {
    setQ((prev) => {
      const arr = [...(prev[field] as string[])];
      if (arr.length === 1 && arr[0] === "") {
        arr[0] = value;
      } else {
        arr.push(value);
      }
      return { ...prev, [field]: arr } as QuestionnaireState;
    });
  };

  const removePhotoFromArray = (field: keyof QuestionnaireState, idx: number) => {
    setQ((prev) => {
      let arr = [...(prev[field] as string[])];
      arr.splice(idx, 1);
      if (arr.length === 0) arr = [""];
      return { ...prev, [field]: arr } as QuestionnaireState;
    });
  };

  const pickImage = async (onDone: (url: string) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to take photos.");
      return;
    }

    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (galleryStatus !== "granted") {
      Alert.alert("Permission required", "Gallery access is needed to pick photos.");
      return;
    }

    Alert.alert("Select Image", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
          });

          if (!result.canceled) {
            uploadImage(result.assets[0].uri, onDone);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
          });

          if (!result.canceled) {
            uploadImage(result.assets[0].uri, onDone);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImage = async (uri: string, onDone: (url: string) => void) => {
    try {
      setSubmitting(true);
      const token = await getToken();
      const formData = new FormData();

      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename || "");
      const type = match ? `image/${match[1]}` : `image`;

      formData.append("photo", {
        uri,
        name: filename,
        type,
      } as any);

      const res = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      onDone(data.url);
    } catch (err: any) {
      Alert.alert("Upload Error", err.message || "Failed to upload image.");
    } finally {
      setSubmitting(false);
    }
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
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const markAsEliminated = async () => {
    Alert.alert(
      "Eliminate Feeder Point",
      "Are you sure you want to eliminate this feeder point? It will be moved to the Eliminated section on your dashboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Eliminate",
          style: "destructive",
          onPress: async () => {
            try {
              const saved = await AsyncStorage.getItem("eliminated_feeders");
              const current = saved ? JSON.parse(saved) : [];
              if (!current.includes(feeder.id)) {
                current.push(feeder.id);
                await AsyncStorage.setItem("eliminated_feeders", JSON.stringify(current));
              }
              Alert.alert("Success", "Feeder point eliminated.");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Failed to eliminate feeder point.");
            }
          }
        }
      ]
    );
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <Text style={styles.sectionTitle}>Distance to feeder</Text>
              {distance === null ? <ActivityIndicator color="#38bdf8" /> : <Text style={styles.distance}>{distance.toFixed(1)} m</Text>}
            </View>
            <TouchableOpacity style={styles.eliminateBtn} onPress={markAsEliminated}>
              <Ban size={18} color="#ef4444" />
              <Text style={styles.eliminateBtnText}>Eliminate</Text>
            </TouchableOpacity>
          </View>
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
            <View style={styles.subSection}>
              <Text style={styles.label}>Segregation / notes</Text>
              <TextInput
                style={styles.input}
                placeholder="Details about waste..."
                value={q.segregationNotes}
                onChangeText={(t) => update("segregationNotes", t)}
              />
              <PhotoPicker
                label="Inside waste photos"
                values={q.insidePhotos}
                onAdd={(url) => addPhotoToArray("insidePhotos", url)}
                onRemove={(idx) => removePhotoFromArray("insidePhotos", idx)}
                onPick={() => pickImage((url) => addPhotoToArray("insidePhotos", url))}
              />
              <RadioRow label="Outside waste present?" value={q.outsideWaste} onChange={(v) => update("outsideWaste", v)} />
              {q.outsideWaste === "YES" && (
                <PhotoPicker
                  label="Outside waste photos"
                  values={q.outsidePhotos}
                  onAdd={(url) => addPhotoToArray("outsidePhotos", url)}
                  onRemove={(idx) => removePhotoFromArray("outsidePhotos", idx)}
                  onPick={() => pickImage((url) => addPhotoToArray("outsidePhotos", url))}
                />
              )}
            </View>
          )}
          {q.wastePresent === "NO" && (
            <View style={styles.subSection}>
              <PhotoPicker
                label="Area clean photo"
                values={q.insidePhotos}
                onAdd={(url) => addPhotoToArray("insidePhotos", url)}
                onRemove={(idx) => removePhotoFromArray("insidePhotos", idx)}
                onPick={() => pickImage((url) => addPhotoToArray("insidePhotos", url))}
              />
              <Text style={styles.label}>Remark</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe cleanliness..."
                value={q.cleanRemark}
                onChangeText={(t) => update("cleanRemark", t)}
              />
            </View>
          )}

          {/* Q2 */}
          <RadioRow
            label="Q2. Are Swachh workers present?"
            value={q.workersPresent}
            onChange={(v) => update("workersPresent", v)}
          />
          {q.workersPresent === "YES" ? (
            <View style={styles.subSection}>
              <Text style={styles.label}>Worker count</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0"
                value={q.workerCount}
                onChangeText={(t) => update("workerCount", t)}
              />
              <Text style={styles.label}>Worker names</Text>
              <TextInput
                style={styles.input}
                placeholder="Name 1, Name 2..."
                value={q.workerNames}
                onChangeText={(t) => update("workerNames", t)}
              />
            </View>
          ) : q.workersPresent === "NO" ? (
            <View style={styles.subSection}>
              <PhotoPicker
                label="Photo (no workers present)"
                values={[q.workersPhoto]}
                onPick={() => pickImage((url) => update("workersPhoto", url))}
                onRemove={() => update("workersPhoto", "")}
              />
            </View>
          ) : null}

          {/* Q3 */}
          <RadioRow label="Q3. Is PMC waste vehicle present?" value={q.vehiclePresent} onChange={(v) => update("vehiclePresent", v)} />
          {q.vehiclePresent === "YES" ? (
            <View style={styles.subSection}>
              <Text style={styles.label}>Vehicle number</Text>
              <TextInput
                style={styles.input}
                placeholder="MH-12-..."
                value={q.vehicleNumber}
                onChangeText={(t) => update("vehicleNumber", t)}
              />
              <Text style={styles.label}>Helper details</Text>
              <TextInput
                style={styles.input}
                placeholder="Driver and helper names..."
                value={q.vehicleHelper}
                onChangeText={(t) => update("vehicleHelper", t)}
              />
            </View>
          ) : q.vehiclePresent === "NO" ? (
            <View style={styles.subSection}>
              <PhotoPicker
                label="Photo (vehicle not present)"
                values={[q.vehiclePhoto]}
                onPick={() => pickImage((url) => update("vehiclePhoto", url))}
                onRemove={() => update("vehiclePhoto", "")}
              />
            </View>
          ) : null}

          {/* Q4 */}
          <View style={styles.qBox}>
            <Text style={styles.label}>Q4. Surrounding area (30m) clean? (3 photos)</Text>
            <PhotoPicker
              values={q.surroundingCleanPhotos}
              onAdd={(url) => addPhotoToArray("surroundingCleanPhotos", url)}
              onRemove={(idx) => removePhotoFromArray("surroundingCleanPhotos", idx)}
              onPick={() => pickImage((url) => addPhotoToArray("surroundingCleanPhotos", url))}
            />
          </View>

          {/* Q5 */}
          <RadioRow label="Q5. Is SWD clean?" value={q.swdClean} onChange={(v) => update("swdClean", v)} />
          <PhotoPicker
            label="SWD photo"
            values={q.swdPhotos}
            onPick={() => pickImage((url) => addPhotoToArray("swdPhotos", url))}
            onRemove={(idx) => removePhotoFromArray("swdPhotos", idx)}
          />

          {/* Q6 */}
          <RadioRow label="Q6. Is SCP signboard/QR visible?" value={q.signboardVisible} onChange={(v) => update("signboardVisible", v)} />
          <PhotoPicker
            label="Signboard/QR photo"
            values={[q.signboardPhoto]}
            onPick={() => pickImage((url) => update("signboardPhoto", url))}
            onRemove={() => update("signboardPhoto", "")}
          />
          <Text style={styles.label}>Signboard Remarks</Text>
          <TextInput
            style={styles.input}
            placeholder="Visibility notes..."
            value={q.signboardRemark}
            onChangeText={(t) => update("signboardRemark", t)}
          />

          {/* Q7 */}
          <RadioRow label="Q7. Third-party dumping observed?" value={q.thirdPartyDumping} onChange={(v) => update("thirdPartyDumping", v)} />
          {q.thirdPartyDumping === "YES" && (
            <View style={styles.subSection}>
              <PhotoPicker
                label="Dumping photo"
                values={[q.dumpingPhoto]}
                onPick={() => pickImage((url) => update("dumpingPhoto", url))}
                onRemove={() => update("dumpingPhoto", "")}
              />
            </View>
          )}

          {/* Q8 */}
          <RadioRow label="Q8. Leachate visible?" value={q.leachateVisible} onChange={(v) => update("leachateVisible", v)} />
          <PhotoPicker
            label="Leachate photo"
            values={[q.leachatePhoto]}
            onPick={() => pickImage((url) => update("leachatePhoto", url))}
            onRemove={() => update("leachatePhoto", "")}
          />

          {/* Q9 */}
          <RadioRow label="Q9. Stray animals present?" value={q.strayAnimals} onChange={(v) => update("strayAnimals", v)} />
          <PhotoPicker
            label="Stray animals photo"
            values={[q.strayAnimalsPhoto]}
            onPick={() => pickImage((url) => update("strayAnimalsPhoto", url))}
            onRemove={() => update("strayAnimalsPhoto", "")}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!withinFence || submitting) && styles.submitDisabled]}
            onPress={submit}
            disabled={!withinFence || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for QC Review</Text>}
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

function PhotoPicker({ label, values, onPick, onRemove }: { label?: string; values: string[]; onPick: () => void; onRemove: (idx: number) => void; onAdd?: (url: string) => void }) {
  const displayValues = values.filter(v => v !== "");

  return (
    <View style={{ marginTop: 12 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.photoGrid}>
        {displayValues.map((v, idx) => (
          <View key={idx} style={styles.photoItem}>
            <Image source={{ uri: v.startsWith("http") ? v : `${API_BASE_URL}${v}` }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(idx)}>
              <X size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addPhotoBtn} onPress={onPick}>
          <Camera size={24} color="#64748b" />
          <Text style={styles.addPhotoText}>Add Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  meta: { color: "#64748b", margin: 16, marginTop: 4, fontSize: 13 },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16
  },
  sectionTitle: { color: "#0f172a", fontSize: 17, fontWeight: "800", marginBottom: 12, letterSpacing: -0.3 },
  distance: { color: "#1d4ed8", fontSize: 24, fontWeight: "800" },
  warning: { color: "#d97706", marginTop: 6, fontWeight: "700", fontSize: 13 },
  error: { color: "#dc2626", marginTop: 6, fontWeight: "600" },
  label: { color: "#475569", marginTop: 16, marginBottom: 6, fontWeight: "700", fontSize: 14 },
  subSection: { paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: "#f1f5f9", marginTop: 8 },
  qBox: { marginTop: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    minWidth: 70,
    alignItems: "center"
  },
  pillActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  pillText: { color: "#64748b", fontWeight: "700", fontSize: 14 },
  pillTextActive: { color: "#ffffff" },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "500"
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  photoItem: { width: 80, height: 80, borderRadius: 12, overflow: "hidden", position: "relative" },
  photoPreview: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  addPhotoText: { fontSize: 10, color: "#64748b", fontWeight: "700" },
  submitBtn: {
    marginTop: 32,
    backgroundColor: "#0f172a",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0f172a",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#ffffff", fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
  eliminateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  eliminateBtnText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "700",
  },
});
