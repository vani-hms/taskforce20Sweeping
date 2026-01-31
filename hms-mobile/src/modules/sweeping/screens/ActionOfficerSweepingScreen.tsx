import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { listSweepingActionRequired, submitSweepingAction } from "../../../api/auth";

export default function ActionOfficerSweepingScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await listSweepingActionRequired();
      setItems(res.inspections);
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchCameraAsync({
      quality: 0.5
    });

    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const submit = async () => {
    if (!remarks || !photo) return alert("Remarks + Photo required");

    await submitSweepingAction(selected.id, {
      remarks,
      photos: [photo]
    });

    setSelected(null);
    setRemarks("");
    setPhoto(null);
    load();
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.sweepingBeat?.geoNodeBeat?.name}</Text>
            <Text>{item.employee?.name}</Text>

            <TouchableOpacity style={styles.resolve} onPress={() => setSelected(item)}>
              <Text style={{ color: "#fff" }}>Resolve</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Resolve Report</Text>

            <TextInput
              placeholder="What action taken?"
              value={remarks}
              onChangeText={setRemarks}
              style={styles.input}
            />

            {photo && <Image source={{ uri: photo }} style={{ width: 100, height: 100 }} />}

            <TouchableOpacity style={styles.pick} onPress={pickPhoto}>
              <Text>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submit} onPress={submit}>
              <Text style={{ color: "#fff" }}>Mark Action Taken</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  title: { fontWeight: "600" },
  resolve: {
    marginTop: 8,
    backgroundColor: "#f97316",
    padding: 8,
    borderRadius: 6,
    alignItems: "center"
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.4)",
    justifyContent: "center",
    padding: 20
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    marginVertical: 10,
    borderRadius: 8
  },
  pick: {
    backgroundColor: "#e5e7eb",
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  submit: {
    marginTop: 10,
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  }
});
