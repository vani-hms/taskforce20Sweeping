import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, NativeModules, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Navigation } from "lucide-react-native";
import { RootStackParamList } from "../../../navigation";
import TaskforceLayout from "../components/TaskforceLayout";
import { listTaskforceAssigned, listTaskforceFeederRequests, listTaskforceReportsPending } from "../../../api/auth";
import { dijkstra, haversineDistance, Node, Edge } from "../utils/dijkstra";
import { LinearGradient } from "expo-linear-gradient";

type Nav = NativeStackNavigationProp<RootStackParamList, "TaskforceHome">;

interface Feeder {
  id: string;
  feederPointName: string;
  latitude: number;
  longitude: number;
  status: string;
}

export default function TaskforceHomeScreen({ navigation }: { navigation: Nav }) {
  const [feeders, setFeeders] = useState<Feeder[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearestFeeder, setNearestFeeder] = useState<Feeder | null>(null);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);
  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [myRequestsCount, setMyRequestsCount] = useState<number>(0);

  const isMapAvailable = useMemo(() => {
    if (Platform.OS === 'web') return false;
    return !!NativeModules.RNMapsAirModule || !!NativeModules.RNMapsManager || !!NativeModules.AirMapModule;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Start fetching data immediately (Parallel)
      const dataPromise = Promise.all([
        listTaskforceAssigned().then(res => res.feederPoints || []).catch(() => []),
        listTaskforceFeederRequests().then(res => res.feederPoints || []).catch(() => []),
        listTaskforceReportsPending().then(res => res.reports || []).catch(() => [])
      ]);

      // 2. Get user location in background (non-blocking for counts)
      Location.requestForegroundPermissionsAsync().then(({ status: locStatus }) => {
        if (locStatus === "granted") {
          return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
      }).then(loc => {
        if (loc) setUserLocation(loc as Location.LocationObject);
      }).catch(err => console.log("Dashboard location fetch error (non-critical):", err));

      // 3. Wait for data results
      const [assigned, requests, reports] = await dataPromise;

      setAssignedCount(assigned.length);
      setFeeders(assigned.filter((f: any) => f.latitude && f.longitude));
      setMyRequestsCount(requests.length);
      setPendingCount(reports.length);

      console.log("[Dashboard] Sync completed. Stats:", {
        assigned: assigned.length,
        requests: requests.length,
        reports: reports.length
      });
    } catch (err: any) {
      console.log("[Dashboard] Structural sync issue:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  useEffect(() => {
    if (userLocation && feeders.length > 0) {
      calculateShortestPath();
    }
  }, [userLocation, feeders]);

  const calculateShortestPath = () => {
    if (!userLocation) return;

    const startNodeId = "user_pos";
    const userNode: Node = {
      id: startNodeId,
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
    };

    const nodes: Node[] = [
      userNode,
      ...feeders.map(f => ({ id: f.id, latitude: f.latitude, longitude: f.longitude }))
    ];

    // Build fully connected graph from user to all feeders
    const edges: Edge[] = feeders.map(f => ({
      from: startNodeId,
      to: f.id,
      weight: haversineDistance(userNode, f)
    }));

    // Run Dijkstra
    const { distances } = dijkstra(nodes, edges, startNodeId);

    // Find nearest
    let minDistance = Infinity;
    let targetId = "";

    feeders.forEach(f => {
      if (distances[f.id] < minDistance) {
        minDistance = distances[f.id];
        targetId = f.id;
      }
    });

    const targetFeeder = feeders.find(f => f.id === targetId);
    if (targetFeeder) {
      setNearestFeeder(targetFeeder);
      setPath([
        { latitude: userNode.latitude, longitude: userNode.longitude },
        { latitude: targetFeeder.latitude, longitude: targetFeeder.longitude }
      ]);
    }
  };

  const initialRegion = useMemo(() => {
    if (userLocation) {
      return {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 18.5204, // Default to Pune
      longitude: 73.8567,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation]);

  return (
    <TaskforceLayout
      title="Taskforce"
      subtitle="Management Dashboard"
      navigation={navigation}
    >
      <View style={styles.container}>
        <View style={styles.kpiRow}>
          <Kpi
            label="Assigned"
            value={loading ? "—" : assignedCount.toString()}
            colors={["#6366f1", "#8b5cf6"]}
            onPress={() => navigation.navigate("TaskforceAssigned")}
          />
          <Kpi
            label="Pending QC"
            value={loading ? "—" : pendingCount.toString()}
            colors={["#f59e0b", "#d97706"]}
            onPress={() => navigation.navigate("TaskforceQcReports")}
          />
          <Kpi
            label="My Requests"
            value={loading ? "—" : myRequestsCount.toString()}
            colors={["#10b981", "#059669"]}
            onPress={() => navigation.navigate("TaskforceMyRequests")}
          />
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Observation Summary</Text>
          <Text style={styles.muted}>
            Visualize assigned feeder points and find the most efficient survey sequence.
          </Text>

          <View style={styles.mapContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#0f172a" />
            ) : isMapAvailable ? (
              <MapView
                provider={PROVIDER_DEFAULT}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation
              >
                {feeders.map((f: any) => (
                  <Marker
                    key={f.id}
                    coordinate={{ latitude: f.latitude, longitude: f.longitude }}
                    title={f.feederPointName}
                    description={`Status: ${f.status}`}
                    pinColor={nearestFeeder?.id === f.id ? "#10b981" : "#3b82f6"}
                  />
                ))}
                {path.length > 0 && (
                  <Polyline
                    coordinates={path}
                    strokeWidth={4}
                    strokeColor="#0f172a"
                    lineDashPattern={[5, 5]}
                  />
                )}
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Navigation size={40} color="#94a3b8" />
                <Text style={styles.fallbackText}>Coordinate Radar Active</Text>
                <Text style={styles.fallbackSub}>Native Map module not linked. Calculations are still accurate.</Text>
              </View>
            )}
          </View>

          {nearestFeeder && (
            <View style={styles.suggestionBox}>
              <View style={styles.iconCircle}>
                <Navigation size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionTitle}>Recommended Starting Point</Text>
                <Text style={styles.suggestionText}>
                  Proceed to <Text style={{ fontWeight: "700" }}>{nearestFeeder.feederPointName}</Text> first. It's the nearest point to your current location.
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("TaskforceAssigned")}
        >
          <Text style={styles.fabText}>Start Survey</Text>
        </TouchableOpacity>
      </View>
    </TaskforceLayout>
  );
}

function Kpi({ label, value, colors, onPress }: { label: string; value: string, colors: [string, string, ...string[]], onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.kpiCardContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiGradient}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8fafc" },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  kpiCardContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  kpiGradient: {
    padding: 16,
    height: 100,
    justifyContent: "space-between",
  },
  kpiLabel: { color: "rgba(255,255,255,0.8)", fontWeight: "600", fontSize: 13 },
  kpiValue: { color: "#ffffff", fontWeight: "800", fontSize: 28 },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 5,
  },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#64748b", fontSize: 13, lineHeight: 18, marginBottom: 16 },
  mapContainer: {
    height: 240,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  fallbackSub: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  suggestionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  suggestionText: {
    color: "#166534",
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 24,
    backgroundColor: "#0f172a",
    paddingHorizontal: 24,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6
  },
  fabText: { color: "#ffffff", fontSize: 16, fontWeight: "800" }
});
