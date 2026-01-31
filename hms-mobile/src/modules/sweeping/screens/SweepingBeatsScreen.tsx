import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Linking,
  ActivityIndicator
} from "react-native";
import { listSweepingBeats } from "../../../api/auth";
import { Layout, Typography, UI } from "../../../theme";

export default function SweepingBeatsScreen({ navigation }: any) {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBeats();
  }, []);

  const loadBeats = async () => {
    try {
      setLoading(true);
      const res = await listSweepingBeats();
      console.log("EMPLOYEE BEATS:", res.beats);
      setBeats(res.beats || []);
    } catch (e) {
      console.log("LOAD BEATS ERROR:", e);
      alert("Failed to load beats");
    } finally {
      setLoading(false);
    }
  };

  const openMap = (beat: any) => {
    console.log("BEAT OBJECT:", beat);

    if (!beat.latitude || !beat.longitude) {
      alert("Beat location not available");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${beat.latitude},${beat.longitude}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={Layout.screenContainer}>
      <Text style={Typography.h2}>My Assigned Beats</Text>

      {beats.length === 0 && (
        <Text style={{ marginTop: 20, color: "#6b7280" }}>
          No beats assigned yet.
        </Text>
      )}

      <FlatList
        data={beats}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[Layout.card, { marginVertical: 8 }]}>

            <Text style={Typography.bodyBold}>
              {item.geoNodeBeat?.name || "Beat"}
            </Text>

            {/* MAP BUTTON */}
            <TouchableOpacity
              style={[
                UI.button,
                { marginTop: 10, backgroundColor: "#22c55e" }
              ]}
              onPress={() => openMap(item)}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                📍 Navigate to Beat
              </Text>
            </TouchableOpacity>

            {/* INSPECTION BUTTON */}
            <TouchableOpacity
              style={[UI.button, UI.buttonPrimary, { marginTop: 10 }]}
              onPress={() =>
                navigation.navigate("SweepingInspection", { beat: item })
              }
            >
              <Text style={UI.buttonTextPrimary}>
                Start Inspection
              </Text>
            </TouchableOpacity>

          </View>
        )}
      />
    </View>
  );
}
