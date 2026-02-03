import React, { useEffect, useState, useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, NativeModules, Platform, Alert, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { RootStackParamList } from "../../../navigation";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { MapPin, CheckCircle, ClipboardList, PlusCircle, LayoutGrid, Navigation as NavIcon, Play } from "lucide-react-native";
import { listTwinbinAssigned, listTwinbinPending, listTwinbinMyRequests } from "../../../api/auth";
import { useAuthContext } from "../../../auth/AuthProvider";
import TwinbinAdminDashboard from "./TwinbinAdminDashboard";
import { dijkstra, haversineDistance, Node, Edge } from "../utils/dijkstra";
import TwinbinLayout from "../components/TwinbinLayout";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinHome">;

type ViewMode = "assigned" | "pending" | "requests";

export default function TwinbinHomeScreen(props: Props) {
  const { auth } = useAuthContext();
  const roles = auth.status === "authenticated" ? auth.roles || [] : [];
  const isAdmin = roles.includes("CITY_ADMIN") || roles.includes("ULB_OFFICER");

  if (isAdmin) {
    return <TwinbinAdminDashboard />;
  }

  return <TwinbinEmployeeHome {...props} />;
}

function TwinbinEmployeeHome({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [assignedBins, setAssignedBins] = useState<any[]>([]);
  const [pendingBins, setPendingBins] = useState<any[]>([]);
  const [requestBins, setRequestBins] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("assigned");
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [nearestBin, setNearestBin] = useState<any>(null);
  const [path, setPath] = useState<{ latitude: number; longitude: number }[]>([]);

  const isMapAvailable = useMemo(() => {
    if (Platform.OS === 'web') return false;
    return !!NativeModules.RNMapsAirModule || !!NativeModules.RNMapsManager || !!NativeModules.AirMapModule;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignedRes, pendingRes, requestsRes] = await Promise.all([
        listTwinbinAssigned().catch(() => ({ bins: [] })),
        listTwinbinPending().catch(() => ({ bins: [] })),
        listTwinbinMyRequests().catch(() => ({ bins: [] }))
      ]);

      setAssignedBins((assignedRes.bins || []).filter((b: any) => b.latitude && b.longitude));
      setPendingBins((pendingRes.bins || []).filter((b: any) => b.latitude && b.longitude));
      setRequestBins((requestsRes.bins || []).filter((b: any) => b.latitude && b.longitude));

      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }
      }).then(loc => {
        if (loc) setUserLocation(loc as Location.LocationObject);
      }).catch(err => console.log("Location fetch error:", err));

    } catch (e) {
      console.log("Data fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentBins = useMemo(() => {
    if (viewMode === "assigned") return assignedBins;
    if (viewMode === "pending") return pendingBins;
    return requestBins;
  }, [viewMode, assignedBins, pendingBins, requestBins]);

  useEffect(() => {
    if (userLocation && currentBins.length > 0) {
      calculateShortestPath();
    } else {
      setNearestBin(null);
      setPath([]);
    }
  }, [userLocation, currentBins]);

  const calculateShortestPath = () => {
    if (!userLocation || currentBins.length === 0) return;

    const startNodeId = "user_pos";
    const userNode: Node = {
      id: startNodeId,
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
    };

    const nodes: Node[] = [
      userNode,
      ...currentBins.map(b => ({ id: b.id, latitude: b.latitude, longitude: b.longitude }))
    ];

    const edges: Edge[] = currentBins.map(b => ({
      from: startNodeId,
      to: b.id,
      weight: haversineDistance(userNode, { latitude: b.latitude, longitude: b.longitude })
    }));

    const { distances } = dijkstra(nodes, edges, startNodeId);

    let minDistance = Infinity;
    let targetId = "";

    currentBins.forEach(b => {
      if (distances[b.id] < minDistance) {
        minDistance = distances[b.id];
        targetId = b.id;
      }
    });

    const target = currentBins.find(b => b.id === targetId);
    if (target) {
      setNearestBin(target);
      setPath([
        { latitude: userNode.latitude, longitude: userNode.longitude },
        { latitude: target.latitude, longitude: target.longitude }
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
      latitude: 18.5204,
      longitude: 73.8567,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [userLocation]);

  return (
    <TwinbinLayout
      title="Litter Bins"
      subtitle="Field Operations Workspace"
      navigation={navigation}
    >
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>

          <View style={styles.kpiRow}>
            <Kpi
              label="Assigned"
              value={assignedBins.length.toString()}
              color={Colors.primary}
              active={viewMode === "assigned"}
              onPress={() => setViewMode("assigned")}
            />
            <Kpi
              label="Pending"
              value={pendingBins.length.toString()}
              color={Colors.warning}
              active={viewMode === "pending"}
              onPress={() => setViewMode("pending")}
            />
            <Kpi
              label="My Requests"
              value={requestBins.length.toString()}
              color={Colors.secondary}
              active={viewMode === "requests"}
              onPress={() => setViewMode("requests")}
            />
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.sectionTitle}>Bin Locations Map</Text>
              <Text style={styles.viewModeText}>Showing {viewMode === "assigned" ? "Assigned" : viewMode === "pending" ? "Pending" : "My Requests"}</Text>
            </View>

            <Text style={styles.muted}>
              Visualize and navigate to litter bins needing attention.
            </Text>

            <View style={styles.mapContainer}>
              {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : isMapAvailable ? (
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={styles.map}
                  initialRegion={initialRegion}
                  showsUserLocation
                >
                  {currentBins.map((b: any) => (
                    <Marker
                      key={b.id}
                      coordinate={{ latitude: b.latitude, longitude: b.longitude }}
                      title={b.areaName}
                      description={b.locationName}
                      pinColor={nearestBin?.id === b.id ? Colors.success : Colors.primary}
                    />
                  ))}
                  {path.length > 0 && (
                    <Polyline
                      coordinates={path}
                      strokeWidth={4}
                      strokeColor={Colors.primary}
                      lineDashPattern={[5, 5]}
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapFallback}>
                  <NavIcon size={40} color={Colors.textMuted} />
                  <Text style={styles.fallbackText}>Coordinate Radar Active</Text>
                  <Text style={styles.fallbackSub}>Native Map module not linked. Calculations are still accurate.</Text>
                </View>
              )}
            </View>

            {nearestBin && (
              <View style={styles.suggestionBox}>
                <View style={styles.iconCircle}>
                  <NavIcon size={20} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>Recommended Next Stop</Text>
                  <Text style={styles.suggestionText}>
                    Visit <Text style={{ fontWeight: "700" }}>{nearestBin.areaName}</Text> first. It's the nearest point to your current location.
                  </Text>
                  <TouchableOpacity
                    style={styles.suggestionButton}
                    onPress={() => navigation.navigate("TwinbinBinDetail", { bin: nearestBin })}
                  >
                    <Text style={styles.suggestionButtonText}>Start Now</Text>
                    <Play size={14} color="#fff" fill="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={[Layout.card, { marginTop: Spacing.l }]}>
            <View style={styles.sectionHead}>
              <Text style={Typography.h2}>Actions</Text>
              <TouchableOpacity
                style={[UI.button, UI.buttonPrimary, { flexDirection: "row", gap: 6 }]}
                onPress={() => navigation.navigate("TwinbinRegister")}
              >
                <PlusCircle size={18} color={Colors.white} />
                <Text style={UI.buttonTextPrimary}>Register Bin</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: Spacing.m, marginTop: Spacing.m }}>
              <ActionCard
                title="Assigned Bins"
                desc="Inspect and report on your assigned bins."
                icon={<MapPin size={24} color={Colors.primary} />}
                onPress={() => navigation.navigate("TwinbinAssigned")}
                primary
              />
              <ActionCard
                title="My Requests"
                desc="Track status of your bin registrations."
                icon={<ClipboardList size={24} color={Colors.secondary} />}
                onPress={() => navigation.navigate("TwinbinMyRequests")}
              />
            </View>
          </View>
        </ScrollView>

        {nearestBin && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("TwinbinBinDetail", { bin: nearestBin })}
          >
            <Text style={styles.fabText}>Start Survey</Text>
          </TouchableOpacity>
        )}
      </View>
    </TwinbinLayout>
  );
}

function Kpi({ label, value, color, active, onPress }: { label: string; value: string; color: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.kpiCard,
        { borderTopColor: color, borderTopWidth: 4 },
        active && { backgroundColor: color + "10", borderColor: color, borderWidth: 1 }
      ]}
    >
      <Text style={[Typography.h1, { color }]}>{value}</Text>
      <Text style={[Typography.caption, active && { fontWeight: "700", color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionCard({
  title,
  desc,
  icon,
  onPress,
  primary
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionCard,
        primary && { backgroundColor: Colors.primaryLight + "40", borderColor: Colors.primaryLight }
      ]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={Typography.h3}>{title}</Text>
        <Text style={Typography.caption}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: Layout.screenContainer,
  title: { ...Typography.h1, color: Colors.primary },
  subtitle: { ...Typography.body, color: Colors.textMuted, marginBottom: Spacing.l },
  kpiRow: { flexDirection: "row", gap: Spacing.m, justifyContent: "space-between" },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: 12,
    gap: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center"
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { ...Typography.h2, color: Colors.text },
  viewModeText: { ...Typography.caption, color: Colors.primary, fontWeight: "700" },
  muted: { ...Typography.muted, marginBottom: Spacing.m },
  mapContainer: {
    height: 200,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapFallback: { padding: 20, alignItems: "center" },
  fallbackText: { ...Typography.h3, marginTop: 8 },
  fallbackSub: { ...Typography.caption, textAlign: "center" },
  suggestionBox: {
    flexDirection: "row",
    backgroundColor: Colors.success + "10",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.success + "30",
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: { ...Typography.h3, color: Colors.success, fontSize: 14 },
  suggestionText: { ...Typography.caption, color: Colors.success, marginTop: 2 },
  suggestionButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  suggestionButtonText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: Colors.white, fontWeight: "800", fontSize: 15 },
});
