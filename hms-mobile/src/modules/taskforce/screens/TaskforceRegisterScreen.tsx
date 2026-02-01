import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { submitTaskforceFeederRequest, ApiError, getMe, fetchPublicZones, fetchPublicWards } from "../../../api/auth";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceRegister">;

const densityOptions = ["LOW", "MEDIUM", "HIGH"];
const accessibilityOptions = ["EASY", "MODERATE", "DIFFICULT"];
const vehicleOptions = ["AUTO", "TRACTOR", "TRUCK", "HANDCART"];

export default function TaskforceRegisterScreen({ navigation }: { navigation: Nav }) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Geo State
  const [cityId, setCityId] = useState<string | null>(null);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [selectedWardId, setSelectedWardId] = useState<string>("");

  const [form, setForm] = useState({
    feederPointName: "",
    areaName: "",
    populationDensity: densityOptions[1],
    accessibilityLevel: accessibilityOptions[1],
    landmark: "",
    locationDescription: "",
    householdsCount: "",
    vehicleType: vehicleOptions[0],
    notes: ""
  });

  useEffect(() => {
    (async () => {
      // 1. Location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
      } else {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }

      // 2. Fetch User & City Context
      try {
        const me = await getMe();
        const cid = me.user.cityId || me.user.modules?.find(m => m.key === 'TASKFORCE' || m.key === 'LITTERBINS')?.cityId; // fallback
        if (cid) {
          setCityId(cid);
          const zRes = await fetchPublicZones(cid);
          setZones(zRes.zones);
        } else {
          setError("Could not determine your City Context.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load city data.");
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      setLoading(true);
      fetchPublicWards(selectedZoneId)
        .then(res => setWards(res.wards))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setWards([]);
      setSelectedWardId("");
    }
  }, [selectedZoneId]);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets?.length) {
      setPhoto(res.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!coords) {
      setError("Location not available");
      return;
    }
    if (!photo) {
      setError("Photo is required");
      return;
    }
    if (!selectedZoneId || !selectedWardId) {
      setError("Please select Zone and Ward");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const zName = zones.find(z => z.id === selectedZoneId)?.name || "";
      const wName = wards.find(w => w.id === selectedWardId)?.name || "";

      await submitTaskforceFeederRequest({
        feederPointName: form.feederPointName.trim(),
        areaName: form.areaName.trim(),
        zoneId: selectedZoneId,
        wardId: selectedWardId,
        zoneName: zName,
        wardName: wName,
        areaType: "RESIDENTIAL",
        populationDensity: form.populationDensity,
        accessibilityLevel: form.accessibilityLevel,
        landmark: form.landmark.trim(),
        locationDescription: form.locationDescription.trim() || form.landmark.trim(),
        householdsCount: Number(form.householdsCount || 0),
        vehicleType: form.vehicleType,
        photoUrl: photo,
        notes: form.notes.trim() || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      Alert.alert("Submitted", "Feeder point request sent for QC review", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register Feeder Point</Text>
      {coords ? (
        <Text style={styles.muted}>GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
      ) : (
        <Text style={styles.error}>Getting location...</Text>
      )}

      <Field label="Feeder point name" value={form.feederPointName} onChangeText={(v) => setForm({ ...form, feederPointName: v })} />
      <Field label="Area name" value={form.areaName} onChangeText={(v) => setForm({ ...form, areaName: v })} />

      {/* ZONE PICKER */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Zone</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedZoneId}
            onValueChange={(itemValue) => setSelectedZoneId(itemValue)}
            dropdownIconColor="#e2e8f0"
            style={{ color: '#e2e8f0', backgroundColor: 'transparent' }}
          >
            <Picker.Item label="Select Zone" value="" color="#000" />
            {zones.map(z => <Picker.Item key={z.id} label={z.name} value={z.id} color="#000" />)}
          </Picker>
        </View>
      </View>

      {/* WARD PICKER */}
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Ward</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedWardId}
            onValueChange={(itemValue) => setSelectedWardId(itemValue)}
            dropdownIconColor="#e2e8f0"
            enabled={wards.length > 0}
            style={{ color: '#e2e8f0', backgroundColor: 'transparent' }}
          >
            <Picker.Item label={wards.length ? "Select Ward" : "Select Zone First"} value="" color="#000" />
            {wards.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} color="#000" />)}
          </Picker>
        </View>
      </View>

      <Field label="Nearest landmark / address" value={form.landmark} onChangeText={(v) => setForm({ ...form, landmark: v })} />
      <Field label="Location description" value={form.locationDescription} onChangeText={(v) => setForm({ ...form, locationDescription: v })} />
      <Field label="Households count" value={form.householdsCount} keyboardType="numeric" onChangeText={(v) => setForm({ ...form, householdsCount: v })} />

      {/* Reuse Picker logic for Vehicle Type just to be nice? User didn't ask but "vehicleOptions" is unused otherwise. 
          User asked to remove free text for Zone/Ward. I'll stick to that constraint only to avoid scope creep or breaking other things. 
          But I will fix the options usage if it's identical effort. 
          Actually, I'll keep Vehicle as Field to avoid risks.
      */}
      <Field label="Vehicle type" value={form.vehicleType} onChangeText={(v) => setForm({ ...form, vehicleType: v })} />

      <Field label="Population density" value={form.populationDensity} onChangeText={(v) => setForm({ ...form, populationDensity: v })} />
      <Field label="Accessibility level" value={form.accessibilityLevel} onChangeText={(v) => setForm({ ...form, accessibilityLevel: v })} />
      <Field label="Additional notes (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />

      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
        <Text style={styles.buttonText}>{photo ? "Change photo" : "Pick location photo"}</Text>
      </TouchableOpacity>
      {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80 }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#64748b"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#0f172a", flexGrow: 1 },
  title: { color: "#e2e8f0", fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  muted: { color: "#94a3b8", textAlign: "center", marginBottom: 12 },
  label: { color: "#e2e8f0", marginBottom: 4 },
  input: {
    backgroundColor: "#0b253a",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    color: "#e2e8f0"
  },
  pickerContainer: {
    backgroundColor: "#0b253a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    overflow: 'hidden'
  },
  button: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#fca5a5", textAlign: "center", marginVertical: 8 },
  photoPicker: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8
  },
  preview: { height: 160, borderRadius: 12, marginTop: 6 }
});
