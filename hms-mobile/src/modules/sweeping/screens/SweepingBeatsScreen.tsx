import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Linking,
  ActivityIndicator,
  Alert
} from "react-native";
import { listSweepingBeats } from "../../../api/auth";
import { Layout, Typography, UI } from "../../../theme";

export default function SweepingBeatsScreen({ navigation }: any) {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBeats();
  }, []);

  const loadBeats = async () => {
    try {
      setLoading(true);
      const res = await listSweepingBeats();
      setBeats(res.beats || []);
    } catch (e) {
      console.log("LOAD BEATS ERROR:", e);
      alert("Failed to load beats");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBeats();
    setRefreshing(false);
  };

  const openMap = (beat: any) => {
    if (!beat.latitude || !beat.longitude) {
      alert("Beat location not available");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${beat.latitude},${beat.longitude}`;
    Linking.openURL(url);
  };

  const startInspection = (beat: any) => {
    Alert.alert(
      "Start Inspection?",
      "Please ensure you are physically at the beat location.",
      [
        { text: "Cancel" },
        {
          text: "Start",
          onPress: () =>
            navigation.navigate("SweepingInspection", { beat })
        }
      ]
    );
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
      <Text style={[Typography.h2, { marginBottom: 10 }]}>
        My Assigned Beats
      </Text>

      {beats.length === 0 && (
        <Text style={{ marginTop: 20, color: "#6b7280" }}>
          No beats assigned yet.
        </Text>
      )}

      <FlatList
        data={beats}
        keyExtractor={(i) => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[Layout.card, { marginVertical: 12, paddingTop: 18 }]}>
            
            {/* STATUS BADGE */}
            <View
              style={{
                position: "absolute",
                right: 14,
                top: 14,
                backgroundColor: "#fde68a",
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 10
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#7c6a00" }}>
                Assigned
              </Text>
            </View>

            {/* TITLE */}
            <Text style={[Typography.bodyBold, { fontSize: 16 }]}>
              {item.geoNodeBeat?.name || "Beat"}
            </Text>

            {/* COORDS */}
            <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              Lat: {item.latitude?.toFixed(4)}   •   Lng: {item.longitude?.toFixed(4)}
            </Text>

            {/* SUBTEXT */}
            <Text style={{ marginTop: 8, fontSize: 12, color: "#2563eb" }}>
              Reach location to begin inspection
            </Text>

            {/* MAP BUTTON */}
            <TouchableOpacity
              style={[
                UI.button,
                {
                  marginTop: 16,
                  backgroundColor: "#22c55e",
                  borderRadius: 10,
                  paddingVertical: 10
                }
              ]}
              onPress={() => openMap(item)}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                📍 Navigate to Beat
              </Text>
            </TouchableOpacity>

            {/* START INSPECTION BUTTON */}
            <TouchableOpacity
              disabled={!item.latitude}
              style={[
                UI.buttonPrimary,
                {
                  marginTop: 12,
                  borderRadius: 10,
                  paddingVertical: 12,
                  opacity: item.latitude ? 1 : 0.5
                }
              ]}
              onPress={() => startInspection(item)}
            >
              <Text style={UI.buttonTextPrimary}>Start Inspection</Text>
            </TouchableOpacity>

            {/* HISTORY LINK */}
            <TouchableOpacity
              onPress={() => navigation.navigate("EmployeeInspectionHistory")}
              style={{ marginTop: 14, alignSelf: "center" }}
            >
              <Text style={{ fontSize: 13, color: "#2563eb" }}>
                View Inspection History →
              </Text>
            </TouchableOpacity>

          </View>
        )}
      />
    </View>
  );
}
