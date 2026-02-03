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
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { listSweepingActionRequired, submitSweepingAction } from "../../../api/auth";
import { Layout, Typography } from "../../../theme";

export default function ActionOfficerSweepingScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await listSweepingActionRequired();
      setItems(res.inspections || []);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pickPhoto = async () => {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!r.canceled) setPhotos([...photos, r.assets[0].uri]);
  };

  const submit = async () => {
    if (!remarks || photos.length === 0)
      return Alert.alert("Required", "Remarks and photo evidence required");

    Alert.alert("Confirm", "Submit action response?", [
      { text: "Cancel" },
      {
        text: "Submit",
        onPress: async () => {
          try {
            setSubmitting(true);
            await submitSweepingAction(selected.id, {
              remarks,
              photos
            });

            setSelected(null);
            setRemarks("");
            setPhotos([]);
            load();
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  if (loading)
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={Layout.screenContainer}>
      <Text style={Typography.h2}>Action Required</Text>

      {items.length === 0 && (
        <Text style={{ marginTop: 20, color: "#6b7280" }}>
          No pending actions.
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[Layout.card, { marginVertical: 8 }]}>
            <Text style={{ fontWeight: "600" }}>
              {item.sweepingBeat?.geoNodeBeat?.name}
            </Text>

            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              Employee: {item.employee?.name}
            </Text>

            <TouchableOpacity
              style={{
                marginTop: 10,
                backgroundColor: "#f97316",
                padding: 10,
                borderRadius: 8,
                alignItems: "center"
              }}
              onPress={() => setSelected(item)}
            >
              <Text style={{ color: "#fff" }}>Resolve</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* MODAL */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.4)",
            justifyContent: "center",
            padding: 20
          }}
        >
          <View style={{ backgroundColor: "#fff", padding: 20, borderRadius: 14 }}>

            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              Action Response
            </Text>

            <TextInput
              placeholder="Describe action taken..."
              value={remarks}
              onChangeText={setRemarks}
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                padding: 10,
                borderRadius: 8,
                marginVertical: 10
              }}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {photos.map(p => (
                <Image
                  key={p}
                  source={{ uri: p }}
                  style={{ width: 80, height: 80, margin: 4, borderRadius: 8 }}
                />
              ))}

              <TouchableOpacity
                onPress={pickPhoto}
                style={{
                  width: 80,
                  height: 80,
                  borderWidth: 1,
                  borderColor: "#94a3b8",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  margin: 4
                }}
              >
                <Text style={{ fontSize: 28 }}>+</Text>
              </TouchableOpacity>
            </View>

            {submitting && <ActivityIndicator style={{ marginTop: 10 }} />}

            <TouchableOpacity
              onPress={submit}
              style={{
                marginTop: 12,
                backgroundColor: "#16a34a",
                padding: 12,
                borderRadius: 8,
                alignItems: "center"
              }}
            >
              <Text style={{ color: "#fff" }}>Submit Action</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={{ marginTop: 10, textAlign: "center" }}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}
