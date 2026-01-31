import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { listTwinbinAssigned, ApiError } from "../../../api/auth";
import { RootStackParamList } from "../../../navigation";
import { Colors, Spacing, Typography, Layout } from "../../../theme";
import { MapPin, AlertCircle, Calendar } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinAssigned">;

export default function TwinbinAssignedScreen({ navigation }: Props) {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listTwinbinAssigned();
      setBins(res.bins || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load assigned bins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
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
          <AlertCircle size={20} color={Colors.danger} />
          <Text style={{ color: Colors.danger, marginLeft: 8 }}>{error}</Text>
        </View>
      ) : null}

      {!bins.length && !error ? (
        <View style={styles.emptyState}>
          <Text style={Typography.h3}>No bins assigned</Text>
          <Text style={Typography.body}>You don't have any pending bin inspections.</Text>
        </View>
      ) : (
        <FlatList
          data={bins}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[Layout.card, { marginBottom: Spacing.m }]}
              onPress={() => navigation.navigate("TwinbinBinDetail", { bin: item })}
            >
              <View style={styles.headerRow}>
                <Text style={Typography.h3}>{item.areaName}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.condition || "Unknown"}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={16} color={Colors.textMuted} />
                <Text style={Typography.muted}>{item.locationName}</Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={16} color={Colors.textMuted} />
                <Text style={Typography.caption}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: "row",
    backgroundColor: Colors.dangerBg,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m,
    alignItems: "center"
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.s
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary
  }
});
