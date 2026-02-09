import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { listSweepingBeats } from "../../../api/auth";
import { Layout, Typography, UI } from "../../../theme";

export default function SweepingBeatsScreen({ navigation }: any) {

  const [beats, setBeats] = useState<any[]>([]);
  const [filteredBeats, setFilteredBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError("");

    try {
      const res = await listSweepingBeats();
      let raw = res.beats || [];

      // SAME AS TOILET → unfinished first
      raw.sort((a: any, b: any) => {
        const aDone =
          a.lastInspectionStatus === "SUBMITTED" ||
          a.lastInspectionStatus === "APPROVED"
            ? 1
            : 0;

        const bDone =
          b.lastInspectionStatus === "SUBMITTED" ||
          b.lastInspectionStatus === "APPROVED"
            ? 1
            : 0;

        return aDone - bDone;
      });

      setBeats(raw);
      setFilteredBeats(raw);

    } catch {
      setError("Unable to load beats.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: any) => {

    const isDone =
      item.lastInspectionStatus === "SUBMITTED" ||
      item.lastInspectionStatus === "APPROVED";

    return (
      <TouchableOpacity
        style={[Layout.card, { marginVertical: 10, opacity: isDone ? 0.7 : 1 }]}
        onPress={() =>
          navigation.navigate("SweepingInspection", { beat: item })
        }
      >

        <Text style={Typography.bodyBold}>
          {item.geoNodeBeat?.name || "Beat"}
        </Text>

        <Text style={{ color: "#6b7280", marginTop: 4 }}>
          {isDone ? "✓ COMPLETED" : "START INSPECTION →"}
        </Text>

      </TouchableOpacity>
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

      <Text style={Typography.h2}>My Assigned Beats</Text>

      <FlatList
        data={filteredBeats}
        renderItem={renderItem}
        keyExtractor={(i) => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          <Text style={{ marginTop: 40, color: "#6b7280", textAlign: "center" }}>
            {error || "No beats assigned"}
          </Text>
        }
      />
    </View>
  );
}
