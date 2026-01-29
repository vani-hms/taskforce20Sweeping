import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { submitRegistration, ApiError, fetchPublicCities, fetchPublicZones, fetchPublicWards } from "../../../api/auth";
import { Picker } from "@react-native-picker/picker";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [cities, setCities] = useState<{ id: string; name: string; ulbCode?: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    cityId: "",
    zoneId: "",
    wardId: "",
    name: "",
    email: "",
    phone: "",
    aadharNumber: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  React.useEffect(() => {
    fetchPublicCities()
      .then((res) => setCities(res.cities || []))
      .catch((err) => console.log("Failed to load cities", err));
  }, []);

  const handleCityChange = async (cityId: string) => {
    update("cityId", cityId);
    update("zoneId", "");
    update("wardId", "");
    setZones([]);
    setWards([]);
    if (!cityId) return;
    try {
      const res = await fetchPublicZones(cityId);
      setZones(res.zones || []);
    } catch (e) {
      console.log("Failed to load zones", e);
    }
  };

  const handleZoneChange = async (zoneId: string) => {
    update("zoneId", zoneId);
    update("wardId", "");
    setWards([]);
    if (!zoneId) return;
    try {
      const res = await fetchPublicWards(zoneId);
      setWards(res.wards || []);
    } catch (e) {
      console.log("Failed to load wards", e);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await submitRegistration(form);
      setStatus("Registration request sent to City Admin");
      setStatus("Registration request sent to City Admin");
      setForm({ cityId: "", zoneId: "", wardId: "", name: "", email: "", phone: "", aadharNumber: "", password: "" });
    } catch (err: any) {
      console.log("Registration Error:", err);
      console.log("Error details:", JSON.stringify(err, null, 2));
      if (err instanceof ApiError) setError(err.message || "Failed to submit");
      else setError("Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Request Registration</Text>
      <Text style={styles.subtitle}>Enter your city ULB code and details. Approval is required before login.</Text>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>ULB Code</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.cityId}
            onValueChange={(v) => handleCityChange(v)}
            style={styles.picker}
          >
            <Picker.Item label="Select ULB Code" value="" />
            {cities.map((c) => (
              <Picker.Item key={c.id} label={`${c.name} (${c.ulbCode || "N/A"})`} value={c.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Zone</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.zoneId}
            onValueChange={(v) => handleZoneChange(v)}
            enabled={!!form.cityId}
            style={styles.picker}
          >
            <Picker.Item label="Select Zone" value="" />
            {zones.map((z) => (
              <Picker.Item key={z.id} label={z.name} value={z.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Ward</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.wardId}
            onValueChange={(v) => update("wardId", v)}
            enabled={!!form.zoneId}
            style={styles.picker}
          >
            <Picker.Item label="Select Ward" value="" />
            {Array.isArray(wards) && wards.map((w) => (
              <Picker.Item key={w.id} label={w.name} value={w.id} />
            ))}
          </Picker>
        </View>
      </View>
      <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => update("name", v)} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={(v) => update("email", v)}
      />
      <TextInput style={styles.input} placeholder="Phone" value={form.phone} onChangeText={(v) => update("phone", v)} />
      <TextInput
        style={styles.input}
        placeholder="Aadhar Number"
        value={form.aadharNumber}
        onChangeText={(v) => update("aadharNumber", v)}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(v) => update("password", v)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {status ? <Text style={styles.success}>{status}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        <Text style={{ color: "#1d4ed8", textAlign: "center" }}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, backgroundColor: "#f5f7fb", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "#4a5568", marginBottom: 16, textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  button: { backgroundColor: "#1d4ed8", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", marginBottom: 8, textAlign: "center" },
  success: { color: "#16a34a", marginBottom: 8, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4, color: "#4b5563" },
  pickerContainer: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, backgroundColor: "#fff" },
  picker: { height: 50 }
});
