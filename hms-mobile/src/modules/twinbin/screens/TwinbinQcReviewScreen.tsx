import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { approveTwinbinBin, rejectTwinbinBin, ApiError, listGeo } from "../../../api/auth";
import { useAuthContext } from "../../../auth/AuthProvider";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { Map, ThumbsUp, ThumbsDown } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcReview">;

export default function TwinbinQcReviewScreen({ route, navigation }: Props) {
  const { bin } = route.params;
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
  const [wardMap, setWardMap] = useState<Record<string, string>>({});
  const { auth } = useAuthContext();
  const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [zonesRes, wardsRes] = await Promise.all([
        listGeo("ZONE").catch(() => ({ nodes: [] })),
        listGeo("WARD").catch(() => ({ nodes: [] }))
      ]);
      setZoneMap(Object.fromEntries((zonesRes.nodes || []).map((n: any) => [n.id, n.name])));
      setWardMap(Object.fromEntries((wardsRes.nodes || []).map((n: any) => [n.id, n.name])));
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load location data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);


  const openMap = () => {
    if (bin.latitude && bin.longitude) {
      Linking.openURL(`https://www.google.com/maps?q=${bin.latitude},${bin.longitude}`);
    }
  };

  const approve = async () => {
    setActionLoading(true);
    setError("");
    try {
      await approveTwinbinBin(bin.id, {});
      Alert.alert("Approved", "Bin approved successfully. You can now assign it to an employee from the Approved Bins list.", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    setActionLoading(true);
    setError("");
    try {
      await rejectTwinbinBin(bin.id);
      Alert.alert("Rejected", "Bin has been rejected", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isQc) {
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <Text style={[Typography.h3, { color: Colors.danger, textAlign: "center" }]}>Access Restricted</Text>
      </View>
    );
  }

  return (
    <ScrollView style={Layout.screenContainer} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <Text style={[Typography.h2, { marginBottom: Spacing.m, color: Colors.primary }]}>Review Bin Request</Text>

      <View style={Layout.card}>
        <LabelValue label="Area Name" value={bin.areaName} />
        <LabelValue label="Area Type" value={bin.areaType} />
        <LabelValue label="Location" value={bin.locationName} />
        <LabelValue label="Zone" value={(bin.zoneId && zoneMap[bin.zoneId]) || "-"} />
        <LabelValue label="Ward" value={(bin.wardId && wardMap[bin.wardId]) || "-"} />
        <LabelValue label="Fixed" value={bin.isFixedProperly ? "Yes" : "No"} />
        <LabelValue label="Lid" value={bin.hasLid ? "Yes" : "No"} />
        <LabelValue label="Condition" value={bin.condition} />

        {bin.latitude && bin.longitude ? (
          <TouchableOpacity style={[UI.button, UI.buttonSecondary, { marginTop: Spacing.m }]} onPress={openMap}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Map size={18} color={Colors.primary} />
              <Text style={UI.buttonTextSecondary}>Open Location</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={[Typography.body, { color: Colors.danger, marginTop: Spacing.m }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[UI.button, { backgroundColor: Colors.dangerBg, flex: 1, marginRight: Spacing.s }]}
          onPress={reject}
          disabled={actionLoading}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ThumbsDown size={18} color={Colors.danger} />
            <Text style={{ color: Colors.danger, fontWeight: "600" }}>Reject</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            UI.button,
            { backgroundColor: Colors.success, flex: 1, marginLeft: Spacing.s }
          ]}
          onPress={approve}
          disabled={actionLoading}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            <ThumbsUp size={18} color={Colors.white} />
            <Text style={{ color: Colors.white, fontWeight: "600" }}>Approve</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[Typography.body, { color: Colors.textMuted }]}>{label}</Text>
      <Text style={[Typography.body, { fontWeight: "600", flexShrink: 1, textAlign: "right" }]}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.l }
});
