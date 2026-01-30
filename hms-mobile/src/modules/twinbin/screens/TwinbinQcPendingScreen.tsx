import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTwinbinPending, listGeo, ApiError } from "../../../api/auth";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthContext } from "../../../auth/AuthProvider";
import { Colors, Spacing, Typography, Layout } from "../../../theme";
import { User, MapPin, Tag, Calendar, AlertCircle } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcPending">;

export default function TwinbinQcPendingScreen({ navigation }: Props) {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
  const [wardMap, setWardMap] = useState<Record<string, string>>({});
  const { auth } = useAuthContext();
  const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [binRes, zoneRes, wardRes] = await Promise.all([
        listTwinbinPending().catch(() => ({ bins: [] })),
        listGeo("ZONE").catch(() => ({ nodes: [] })),
        listGeo("WARD").catch(() => ({ nodes: [] }))
      ]);
      setBins(binRes.bins || []);
      setZoneMap(Object.fromEntries((zoneRes.nodes || []).map((n: any) => [n.id, n.name])));
      setWardMap(Object.fromEntries((wardRes.nodes || []).map((n: any) => [n.id, n.name])));
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load pending bins");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => load();

  if (!isQc) {
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center", alignItems: "center" }]}>
        <AlertCircle size={48} color={Colors.danger} />
        <Text style={[Typography.h3, { marginTop: Spacing.m, color: Colors.danger }]}>Access Restricted</Text>
        <Text style={Typography.body}>Only QC users can view this screen.</Text>
      </View>
    );
  }

  if (loading && !bins.length) {
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={Layout.screenContainer}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={{ color: Colors.danger }}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={bins}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={Typography.h3}>No pending requests</Text>
              <Text style={Typography.body}>All clear for now!</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[Layout.card, { marginBottom: Spacing.m }]}
            onPress={() => navigation.navigate("TwinbinQcReview", { bin: item })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={Typography.h3}>{item.areaName}</Text>
              <Text style={[Typography.caption, { color: Colors.primary, fontWeight: "700" }]}>{item.status}</Text>
            </View>

            <View style={styles.row}>
              <MapPin size={14} color={Colors.textMuted} />
              <Text style={Typography.caption}>{item.locationName}</Text>
            </View>

            <View style={styles.row}>
              <Tag size={14} color={Colors.textMuted} />
              <Text style={Typography.caption}>Z: {zoneMap[item.zoneId] || "-"} / W: {wardMap[item.wardId] || "-"}</Text>
            </View>

            <View style={styles.divider} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={styles.row}>
                <User size={14} color={Colors.textMuted} />
                <Text style={Typography.caption}>{item.requestedBy?.name || "Unknown"}</Text>
              </View>
              <View style={styles.row}>
                <Calendar size={14} color={Colors.textMuted} />
                <Text style={Typography.caption}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: Colors.dangerBg,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.s
  }
});
