import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from "react-native";
import * as Location from "expo-location";
import { listGeo, requestTwinbinBin, ApiError } from "../../../api/auth";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { MapPin, CheckSquare, Square, Navigation, CheckCircle } from "lucide-react-native";

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

  useEffect(() => {
    const loadGeo = async () => {
      try {
        const [zonesRes, wardsRes] = await Promise.all([
          listGeo("ZONE").catch(() => ({ nodes: [] })),
          listGeo("WARD").catch(() => ({ nodes: [] }))
        ]);
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
    <ScrollView style={Layout.screenContainer} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <Text style={[Typography.h2, { color: Colors.primary }]}>New Bin Registration</Text>
      <Text style={[Typography.body, { marginBottom: Spacing.l, color: Colors.textMuted }]}>
        Fill in details to register a new litter bin.
      </Text>

      <View style={[Layout.card, { marginBottom: Spacing.m }]}>
        <InputLabel label="Area Name" />
        <TextInput style={styles.input} value={form.areaName} onChangeText={(v) => update("areaName", v)} placeholder="e.g. Central Park Gate 1" />

        <InputLabel label="Location Name" />
        <TextInput style={styles.input} value={form.locationName} onChangeText={(v) => update("locationName", v)} placeholder="e.g. Near Bus Stop" />

        <InputLabel label="Road Type" />
        <TextInput style={styles.input} value={form.roadType} onChangeText={(v) => update("roadType", v)} placeholder="e.g. Arterial Road" />

        <InputLabel label="Area Type" />
        <View style={styles.selectRow}>
          {["RESIDENTIAL", "COMMERCIAL", "SLUM"].map((val) => (
            <SelectOption key={val} label={val} selected={form.areaType === val} onSelect={() => update("areaType", val)} />
          ))}
        </View>
      </View>

      <View style={[Layout.card, { marginBottom: Spacing.m }]}>
        <Text style={Typography.h3}>Geography</Text>

        <InputLabel label="Zone (Optional)" />
        <View style={styles.selectRow}>
          {zones.map((z) => (
            <SelectOption key={z.id} label={z.name} selected={form.zoneId === z.id} onSelect={() => update("zoneId", form.zoneId === z.id ? "" : z.id)} />
          ))}
        </View>

        <InputLabel label="Ward (Optional)" />
        <View style={styles.selectRow}>
          {filteredWards.map((w) => (
            <SelectOption key={w.id} label={w.name} selected={form.wardId === w.id} onSelect={() => update("wardId", form.wardId === w.id ? "" : w.id)} />
          ))}
        </View>
      </View>

      <View style={[Layout.card, { marginBottom: Spacing.m }]}>
        <Text style={Typography.h3}>Status & Condition</Text>

        <View style={{ marginTop: Spacing.m, gap: Spacing.m }}>
          <Checkbox label="Is bin fixed properly?" checked={form.isFixedProperly} onChange={() => update("isFixedProperly", !form.isFixedProperly)} />
          <Checkbox label="Has lid?" checked={form.hasLid} onChange={() => update("hasLid", !form.hasLid)} />
        </View>

        <InputLabel label="Condition" />
        <View style={styles.selectRow}>
          {["GOOD", "DAMAGED"].map((val) => (
            <SelectOption key={val} label={val} selected={form.condition === val} onSelect={() => update("condition", val)} />
          ))}
        </View>
      </View>

      <View style={[Layout.card, { marginBottom: Spacing.l }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={Typography.h3}>Location</Text>
          {form.latitude ? <CheckCircle size={16} color={Colors.success} /> : null}
        </View>

        <View style={{ flexDirection: "row", gap: Spacing.m, marginTop: Spacing.s }}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: Colors.background }]} value={form.latitude} editable={false} placeholder="Lat" />
          <TextInput style={[styles.input, { flex: 1, backgroundColor: Colors.background }]} value={form.longitude} editable={false} placeholder="Lng" />
        </View>

        <TouchableOpacity style={[UI.button, UI.buttonSecondary, { marginTop: Spacing.s }]} onPress={fetchLocation} disabled={locLoading}>
          {locLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Navigation size={18} color={Colors.primary} />
              <Text style={UI.buttonTextSecondary}>Fetch GPS</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={{ color: Colors.danger, marginBottom: Spacing.m, textAlign: "center" }}>{error}</Text> : null}

      <TouchableOpacity
        style={[UI.button, canSubmit ? UI.buttonPrimary : { backgroundColor: Colors.textMuted }]}
        onPress={submit}
        disabled={!canSubmit}
      >
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={UI.buttonTextPrimary}>Submit Registration</Text>}
      </TouchableOpacity>

    </ScrollView>
  );
}

function InputLabel({ label }: { label: string }) {
  return <Text style={[Typography.body, { fontWeight: "600", marginTop: Spacing.s, marginBottom: 4 }]}>{label}</Text>;
}

function SelectOption({ label, selected, onSelect }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.option,
        selected && { backgroundColor: Colors.primary, borderColor: Colors.primary }
      ]}
      onPress={onSelect}
    >
      <Text style={[Typography.caption, selected ? { color: Colors.white, fontWeight: "700" } : { color: Colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <TouchableOpacity style={{ flexDirection: "row", items: "center", gap: 8 }} onPress={onChange}>
      {checked ? <CheckSquare size={20} color={Colors.primary} /> : <Square size={20} color={Colors.textMuted} />}
      <Text style={Typography.body}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: Colors.text
  },
  selectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background
  }
});
