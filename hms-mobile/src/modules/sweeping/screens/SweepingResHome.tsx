import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { ModuleRecordsApi } from "../../../api/modules";
import { getSession } from "../../../auth/session";


type Nav = NativeStackNavigationProp<RootStackParamList, "Module">;

const CARDS = ["Add Record (Coming Soon)", "Reports (Coming Soon)", "Activity (Coming Soon)"];

export default function SweepingResHome({ navigation }: { navigation: Nav }) {
  const [data, setData] = useState<{ city?: string; module?: string; count?: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = getSession();
      const roles = session.roles || [];

      // 🎯 ROLE BASED REDIRECT
      if (roles.includes("EMPLOYEE")) {
        navigation.replace("SweepingBeats");
        return;
      }

      if (roles.includes("QC")) {
        navigation.replace("QcSweepingList");
        return;
      }

      if (roles.includes("ACTION_OFFICER")) {
        navigation.replace("ActionOfficerSweeping");
        return;
      }

      // fallback dashboard info (admin view)
      setError("");
      try {
        const res = await ModuleRecordsApi.getRecords("SWEEP_RES");
        setData(res);
      } catch {
        setError("Failed to load records");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);


  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <Text style={styles.title}>{data.module}</Text>
          <Text style={styles.subtitle}>City: {data.city}</Text>
          <Text style={styles.count}>Records: {data.count ?? 0}</Text>
          <View style={styles.cardContainer}>
            {CARDS.map((c) => (
              <View style={styles.card} key={c}>
                <Text style={styles.cardTitle}>{c}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.backLink} onPress={() => navigation.goBack()}>
        ← Back
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f5f7fb", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 16, marginTop: 4, color: "#4b5563" },
  count: { fontSize: 18, marginTop: 12, fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 16 },
  cardContainer: { width: "100%", marginTop: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  backLink: { marginTop: 16, color: "#1d4ed8", fontWeight: "600" }
});
