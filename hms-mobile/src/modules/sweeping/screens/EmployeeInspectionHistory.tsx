import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { Layout, Typography } from "../../../theme";
import { listEmployeeInspections } from "../../../api/auth";

const STATUS_COLORS: any = {
  SUBMITTED: "#fde68a",
  APPROVED: "#dcfce7",
  REJECTED: "#fee2e2",
  ACTION_REQUIRED: "#fed7aa",
  ACTION_SUBMITTED: "#dbeafe"
};

export default function EmployeeInspectionHistory({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const r = await listEmployeeInspections();
      setItems(r.inspections || []);
    } catch {
      alert("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={Layout.screenContainer}>
      <Text style={Typography.h2}>Inspection History</Text>

      {items.length === 0 && (
        <Text style={{ marginTop: 20, color: "#6b7280" }}>
          No inspections yet.
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[Layout.card, { marginVertical: 8 }]}
            onPress={() =>
              navigation.navigate("EmployeeInspectionDetail", { inspection: item })
            }
          >
            <Text style={{ fontWeight: "600" }}>
              {item.sweepingBeat?.geoNodeBeat?.name || "Beat"}
            </Text>

            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
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
              <Text style={{ fontSize: 12 }}>{item.status.replace("_", " ")}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
