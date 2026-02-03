import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import { listSweepingQcInspections } from "../../../api/auth";
import { useNavigation } from "@react-navigation/native";
import { Layout, Typography } from "../../../theme";

const STATUS_COLORS: any = {
  SUBMITTED: "#fde68a",
  APPROVED: "#dcfce7",
  REJECTED: "#fee2e2",
  ACTION_REQUIRED: "#fed7aa",
  ACTION_SUBMITTED: "#dbeafe"
};

export default function QcSweepingList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await listSweepingQcInspections();
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

  if (loading)
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={Layout.screenContainer}>
      <Text style={Typography.h2}>Sweeping Inspections</Text>

      {items.length === 0 && (
        <Text style={{ marginTop: 20, color: "#6b7280" }}>
          No inspections available.
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[Layout.card, { marginVertical: 8 }]}
            onPress={() =>
              navigation.navigate("QcSweepingDetail", { inspection: item })
            }
          >
            <Text style={{ fontWeight: "600", fontSize: 16 }}>
              {item.sweepingBeat?.geoNodeBeat?.name || "Beat"}
            </Text>

            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              Employee: {item.employee?.name || "-"}
            </Text>

            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>

            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 8,
                backgroundColor: STATUS_COLORS[item.status] || "#e5e7eb",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10
              }}
            >
              <Text style={{ fontSize: 12 }}>
                {item.status.replace("_", " ")}
              </Text>
            </View>

            <View
              style={{
                marginTop: 10,
                backgroundColor: "#2563eb",
                padding: 8,
                borderRadius: 8,
                alignItems: "center"
              }}
            >
              <Text style={{ color: "#fff" }}>View Details</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
