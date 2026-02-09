import React, { useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { submitSweepingAction } from "../../../api/auth";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function ActionOfficerSweepingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { inspection } = route.params;

  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const pickPhoto = async () => {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const submit = async () => {
    if (!remarks || !photo) return alert("Remarks + Photo required");

    await submitSweepingAction(inspection.id, {
      remarks,
      photos: [photo]
    });

    alert("Action Submitted");
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>

      <Text style={styles.title}>Beat</Text>
      <Text>{inspection.sweepingBeat?.geoNodeBeat?.name}</Text>

      <Text style={styles.title}>Employee</Text>
      <Text>{inspection.employee?.name}</Text>

      <Text style={styles.title}>Inspection Answers</Text>

      {inspection.answers?.map((a: any, i: number) => (
        <View key={i} style={styles.answer}>
          <Text>{a.questionCode}</Text>
          <Text>{a.answer ? "YES" : "NO"}</Text>
        </View>
      ))}

      <Text style={styles.title}>Inspection Photos</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {inspection.photos?.map((p: any, i: number) => (
          <Image key={i} source={{ uri: p.photoUrl }} style={styles.photo} />
        ))}
      </View>

      <TextInput
        placeholder="Action remarks"
        value={remarks}
        onChangeText={setRemarks}
        style={styles.input}
      />

      {photo && <Image source={{ uri: photo }} style={styles.photo} />}

      <TouchableOpacity style={styles.pick} onPress={pickPhoto}>
        <Text>Capture Action Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submit} onPress={submit}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Submit Action</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "700", marginTop: 12 },
  answer: { borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 6 },
  photo: { width: 90, height: 90, margin: 4, borderRadius: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginTop: 12,
    borderRadius: 8
  },
  pick: {
    marginTop: 10,
    backgroundColor: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  submit: {
    marginTop: 12,
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  }
});
