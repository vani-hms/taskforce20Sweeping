import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { RootStackParamList } from "../../../navigation";
import { submitTwinbinActionTaken, ApiError } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinActionRequiredDetail">;

export default function TwinbinActionRequiredDetailScreen({ route, navigation }: Props) {
  const { visit } = route.params;
  const [remark, setRemark] = useState("");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const dataUrl = asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri;
      setPhoto(dataUrl);
    }
  };

  const submit = async () => {
    if (!remark.trim() || !photo) {
      setError("Remark and photo are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitTwinbinActionTaken(visit.id, { actionRemark: remark, actionPhotoUrl: photo });
      Alert.alert("Submitted", "Action taken submitted", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Action Required</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Bin</Text>
        <Text style={styles.value}>{visit.bin?.areaName} / {visit.bin?.locationName}</Text>
        <Text style={styles.label}>QC Remark</Text>
        <Text style={styles.value}>{visit.qcRemark || "-"}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Action Remark</Text>
        <TextInput
          style={styles.input}
          value={remark}
          onChangeText={setRemark}
          placeholder="Describe action taken"
          multiline
        />
        <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={pickPhoto}>
          <Text style={styles.buttonText}>Capture Action Photo</Text>
        </TouchableOpacity>
        {photo ? <Image source={{ uri: photo }} style={styles.preview} /> : <Text style={styles.muted}>Photo required</Text>}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#16a34a" }]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit Action"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12
  },
  label: { color: "#475569", fontWeight: "600", marginTop: 6 },
  value: { color: "#0f172a", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    marginTop: 6,
    textAlignVertical: "top"
  },
  button: {
    marginTop: 10,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  muted: { color: "#4b5563", marginTop: 6 },
  error: { color: "#dc2626", marginTop: 8 },
  preview: { width: "100%", height: 180, borderRadius: 10, marginTop: 10 }
});
