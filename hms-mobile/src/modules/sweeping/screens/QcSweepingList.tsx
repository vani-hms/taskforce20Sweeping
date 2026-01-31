import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { listSweepingQcInspections } from "../../../api/auth";
import { useNavigation } from "@react-navigation/native";

export default function QcSweepingList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await listSweepingQcInspections();
      setItems(res.inspections);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("QcSweepingDetail", { inspection: item })}
        >
          <Text style={styles.title}>{item.sweepingBeat?.geoNodeBeat?.name}</Text>
          <Text>{item.employee?.name}</Text>
          <Text>Status: {item.status}</Text>

          <View style={styles.btn}>
            <Text style={{ color: "#fff" }}>View Details</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  title: { fontSize: 16, fontWeight: "600" },
  btn: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    padding: 8,
    borderRadius: 6,
    alignItems: "center"
  }
});
