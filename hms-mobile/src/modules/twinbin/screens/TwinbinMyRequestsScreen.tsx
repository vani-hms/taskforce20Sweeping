import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { listTwinbinMyRequests, ApiError } from "../../../api/auth";
import { Colors, Spacing, Typography, Layout } from "../../../theme";
import { MapPin, Clock, AlertCircle } from "lucide-react-native";
import TwinbinLayout from "../components/TwinbinLayout";

export default function TwinbinMyRequestsScreen({ navigation }: any) {
  const [bins, setBins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listTwinbinMyRequests();
      setBins(data.bins || []);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <TwinbinLayout
      title="My Requests"
      subtitle="Track status of your bin registrations"
      navigation={navigation}
      showBack={true}
    >
      <View style={Layout.screenContainer}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorBox}>
                <AlertCircle size={20} color={Colors.danger} />
                <Text style={{ color: Colors.danger, marginLeft: 8 }}>{error}</Text>
              </View>
            ) : null}

            {!bins.length && !error ? (
              <View style={styles.emptyState}>
                <Text style={Typography.h3}>No requests found</Text>
                <Text style={Typography.body}>You haven't submitted any bin registrations yet.</Text>
              </View>
            ) : (
              <FlatList
                data={bins}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                renderItem={({ item }) => (
                  <View style={[Layout.card, { marginBottom: Spacing.m }]}>
                    <View style={styles.headerRow}>
                      <Text style={Typography.h3}>{item.areaName}</Text>
                      <StatusBadge status={item.status} />
                    </View>

                    <View style={styles.infoRow}>
                      <MapPin size={16} color={Colors.textMuted} />
                      <Text style={Typography.muted}>{item.locationName}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Clock size={16} color={Colors.textMuted} />
                      <Text style={Typography.caption}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>
    </TwinbinLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = Colors.warningBg;
  let text = Colors.warning;
  if (status === "APPROVED") { bg = Colors.successBg; text = Colors.success; }
  else if (status === "REJECTED") { bg = Colors.dangerBg; text = Colors.danger; }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{status}</Text>
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700"
  }
});
