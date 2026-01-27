import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { submitRegistration, ApiError } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    ulbCode: "",
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

  const onSubmit = async () => {
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await submitRegistration(form);
      setStatus("Registration request sent to City Admin");
      setForm({ ulbCode: "", name: "", email: "", phone: "", aadharNumber: "", password: "" });
    } catch (err: any) {
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

      <TextInput
        style={styles.input}
        placeholder="City ULB Code"
        value={form.ulbCode}
        onChangeText={(v) => update("ulbCode", v)}
      />
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
  success: { color: "#16a34a", marginBottom: 8, textAlign: "center" }
});
