import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { listEmployees, ApiError } from "../../../api/employees";
import { useAuthContext } from "../../../auth/AuthProvider";

export default function MyEmployeesScreen() {
  const { auth } = useAuthContext();
  const modules = auth.status === "authenticated" ? auth.modules || [] : [];
  const moduleKeys = useMemo(() => modules.map((m) => m.key), [modules]);

  const [activeModule, setActiveModule] = useState<string | null>(moduleKeys[0] || null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (moduleKey?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await listEmployees(moduleKey || undefined);
      setEmployees(data.employees || []);
    } catch (err: any) {
      if (err instanceof ApiError) setError(err.message || "Failed to load employees");
      else setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(activeModule || undefined);
  }, [activeModule]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Employees</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {moduleKeys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeModule === key ? styles.tabActive : undefined]}
            onPress={() => setActiveModule(key)}
          >
            <Text style={activeModule === key ? styles.tabTextActive : styles.tabText}>{key}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.tab, activeModule === null ? styles.tabActive : undefined]}
          onPress={() => setActiveModule(null)}
        >
          <Text style={activeModule === null ? styles.tabTextActive : styles.tabText}>All</Text>
        </TouchableOpacity>
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!employees.length ? (
        <Text style={styles.muted}>
          {activeModule ? "No employees assigned to this module." : "No employees to display."}
        </Text>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>{item.email}</Text>
              <Text style={styles.muted}>Role: {item.role}</Text>
              <Text style={styles.muted}>Modules: {(item.modules || []).map((m: any) => m.name || m.key).join(", ")}</Text>
              <Text style={styles.muted}>
                Zones/Wards: {[...(item.zones || []), ...(item.wards || [])].join(", ") || "-"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  tabs: { paddingVertical: 4, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginRight: 8
  },
  tabActive: { backgroundColor: "#cbd5e1", borderColor: "#94a3b8" },
  tabText: { color: "#334155", fontWeight: "600" },
  tabTextActive: { color: "#0f172a", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  muted: { color: "#4b5563", marginTop: 4 },
  error: { color: "#dc2626", marginBottom: 8 }
});
