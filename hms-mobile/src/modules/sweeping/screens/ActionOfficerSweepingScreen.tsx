import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { listSweepingActionRequired } from "../../../api/auth";
import { useNavigation } from "@react-navigation/native";

export default function ActionOfficerSweepingScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await listSweepingActionRequired();
      setItems(res.inspections || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("ActionOfficerSweepingDetail", { inspection: item })}
        >
          <Text style={styles.title}>
            {item.sweepingBeat?.geoNodeBeat?.name}
          </Text>

          <Text>{item.employee?.name}</Text>

          <View style={styles.badge}>
            <Text style={{ color: "#92400e" }}>ACTION REQUIRED</Text>
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
  title: { fontWeight: "700" },
  badge: {
    marginTop: 6,
    backgroundColor: "#fffbeb",
    padding: 6,
    borderRadius: 6,
    alignSelf: "flex-start"
  }
});
