import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from "react-native";
import * as Location from "expo-location";
import { listGeo, requestTwinbinBin, ApiError } from "../../../api/auth";

type GeoNode = { id: string; name: string; parentId?: string | null };

export default function TwinbinRegisterScreen({ navigation }: any) {
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [form, setForm] = useState({
    zoneId: "",
    wardId: "",
    areaType: "RESIDENTIAL",
    areaName: "",
    locationName: "",
    roadType: "",
    isFixedProperly: false,
    hasLid: false,
    condition: "GOOD",
    latitude: "",
    longitude: ""
  });
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadGeo = async () => {
      try {
        const [zonesRes, wardsRes] = await Promise.all([listGeo("ZONE"), listGeo("WARD")]);
        setZones(zonesRes.nodes || []);
        setWards(wardsRes.nodes || []);
      } catch {
        setError("Failed to load geo data");
      }
    };
    loadGeo();
  }, []);

  const filteredWards = useMemo(
    () => wards.filter((w) => !form.zoneId || (w.parentId && w.parentId === form.zoneId)),
    [wards, form.zoneId]
  );

  const fetchLocation = async () => {
    setLocLoading(true);
    setError("");
    setStatus("");
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== "granted") {
      setError("Location permission denied");
      setLocLoading(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm((f) => ({
        ...f,
        latitude: String(loc.coords.latitude),
        longitude: String(loc.coords.longitude)
      }));
    } catch (err: any) {
      setError(err.message || "Failed to fetch location");
    } finally {
      setLocLoading(false);
    }
  };

  const canSubmit =
    form.areaName && form.locationName && form.roadType && form.latitude && form.longitude && !loading && !locLoading;

  const update = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await requestTwinbinBin({
        zoneId: form.zoneId || undefined,
        wardId: form.wardId || undefined,
        areaType: form.areaType as any,
        areaName: form.areaName,
        locationName: form.locationName,
        roadType: form.roadType,
        isFixedProperly: form.isFixedProperly,
        hasLid: form.hasLid,
        condition: form.condition as any,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude)
      });
      setStatus("Request submitted");
      Alert.alert("Success", "Request submitted", [
        { text: "OK", onPress: () => navigation.navigate("TwinbinMyRequests") }
      ]);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : "Failed to submit";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register Litter Bin</Text>

      <Text style={styles.label}>Zone (optional)</Text>
      <View style={styles.select}>
        {zones.map((z) => (
          <TouchableOpacity
            key={z.id}
            style={[styles.option, form.zoneId === z.id ? styles.optionActive : undefined]}
            onPress={() => update("zoneId", form.zoneId === z.id ? "" : z.id)}
          >
            <Text style={form.zoneId === z.id ? styles.optionTextActive : styles.optionText}>{z.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ward (optional)</Text>
      <View style={styles.select}>
        {filteredWards.map((w) => (
          <TouchableOpacity
            key={w.id}
            style={[styles.option, form.wardId === w.id ? styles.optionActive : undefined]}
            onPress={() => update("wardId", form.wardId === w.id ? "" : w.id)}
          >
            <Text style={form.wardId === w.id ? styles.optionTextActive : styles.optionText}>{w.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Area Type</Text>
      <View style={styles.selectRow}>
        {["RESIDENTIAL", "COMMERCIAL", "SLUM"].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.option, form.areaType === val ? styles.optionActive : undefined]}
            onPress={() => update("areaType", val)}
          >
            <Text style={form.areaType === val ? styles.optionTextActive : styles.optionText}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Area Name</Text>
      <TextInput style={styles.input} value={form.areaName} onChangeText={(v) => update("areaName", v)} />

      <Text style={styles.label}>Location Name</Text>
      <TextInput style={styles.input} value={form.locationName} onChangeText={(v) => update("locationName", v)} />

      <Text style={styles.label}>Road Type</Text>
      <TextInput style={styles.input} value={form.roadType} onChangeText={(v) => update("roadType", v)} />

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.checkbox, form.isFixedProperly ? styles.checkboxActive : undefined]}
          onPress={() => update("isFixedProperly", !form.isFixedProperly)}
        >
          <Text style={styles.checkboxText}>Is bin fixed properly?</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checkbox, form.hasLid ? styles.checkboxActive : undefined]}
          onPress={() => update("hasLid", !form.hasLid)}
        >
          <Text style={styles.checkboxText}>Has lid?</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Condition</Text>
      <View style={styles.selectRow}>
        {["GOOD", "DAMAGED"].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.option, form.condition === val ? styles.optionActive : undefined]}
            onPress={() => update("condition", val)}
          >
            <Text style={form.condition === val ? styles.optionTextActive : styles.optionText}>{val}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput style={styles.input} value={form.latitude} editable={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput style={styles.input} value={form.longitude} editable={false} />
        </View>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: "#0ea5e9" }]} onPress={fetchLocation} disabled={locLoading}>
        {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>📍 Fetch Live Location</Text>}
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.success}>{status}</Text> : null}

      <TouchableOpacity style={[styles.button, !canSubmit ? { opacity: 0.5 } : undefined]} disabled={!canSubmit} onPress={submit}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f5f7fb" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "600", marginTop: 10 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginTop: 6
  },
  button: {
    marginTop: 12,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  checkbox: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff"
  },
  checkboxActive: { backgroundColor: "#cbd5e1", borderColor: "#94a3b8" },
  checkboxText: { color: "#0f172a" },
  select: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff"
  },
  optionActive: { backgroundColor: "#cbd5e1", borderColor: "#94a3b8" },
  optionText: { color: "#334155" },
  optionTextActive: { color: "#0f172a", fontWeight: "700" },
  error: { color: "#dc2626", marginTop: 8 },
  success: { color: "#16a34a", marginTop: 8 }
});
