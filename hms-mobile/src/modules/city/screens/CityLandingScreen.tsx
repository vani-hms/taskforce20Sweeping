import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../navigation";
import { useAuthContext } from "../../../auth/AuthProvider";
import { fetchCityInfo } from "../../../api/auth";
import { getSession } from "../../../auth/session";
import { ModuleRecordsApi } from "../../../api/modules";
import { listRegistrationRequests } from "../../../api/auth";

type Props = NativeStackScreenProps<RootStackParamList, "CityLanding">;

export default function CityLandingScreen({ route, navigation }: Props) {
  const { auth, logout } = useAuthContext();
  const [cityName, setCityName] = useState(
    route.params?.cityName || (auth.status === "authenticated" ? auth.cityName : "")
  );
  const [loading, setLoading] = useState(!cityName);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [requests, setRequests] = useState<{ id: string; name: string; status: string }[]>([]);
  const [requestsError, setRequestsError] = useState("");
  const modules = auth.status === "authenticated" && auth.modules ? auth.modules : [];
  const roles = auth.status === "authenticated" ? auth.roles || [] : [];
  const isQc = roles.includes("QC");
  const isCityAdmin = roles.includes("CITY_ADMIN");
  const hasTwinbin = modules.some((m) => m.key === "TWINBIN");
  const moduleCards = modules.filter((m) => m.key !== "TWINBIN");

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      navigation.replace("Login");
      return;
    }
    setLoading(true);
    const load = async () => {
      setError("");
      try {
        if (!cityName) {
          const { city } = await fetchCityInfo();
          setCityName(city.name);
        }
        if (!modules.length) {
          setCounts({});
          setLoading(false);
          return;
        }
        const results = await Promise.all(modules.map((m) => ModuleRecordsApi.getRecords(m.key).catch(() => null)));
        const map: Record<string, number> = {};
        modules.forEach((m, idx) => {
          const res = results[idx];
          if (res) map[m.key] = res.count;
        });
        setCounts(map);
        if (isCityAdmin) {
          try {
            const data = await listRegistrationRequests();
            setRequests((data.requests || []).slice(0, 5));
            setRequestsError("");
          } catch {
            setRequestsError("Failed to load registration requests");
          }
        }
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cityName, navigation, modules]);

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  const openModule = (moduleKey: string) => {
    if (!modules.find((m) => m.key === moduleKey)) {
      setError("You are not assigned to this module yet.");
      return;
    }
    navigation.navigate("Module", { moduleKey });
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" />
      ) : (
        <>
          <Text style={styles.welcome}>WELCOME</Text>
          <Text style={styles.city}>{cityName || "Your City"}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {modules.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>You are not assigned to any module yet.</Text>
              <Text style={styles.cardSubtitle}>Please contact your city administrator.</Text>
            </View>
          ) : (
            <FlatList
              data={[
                ...moduleCards,
                ...(isQc
                  ? [
                      {
                        key: "__employees__",
                        name: "Employees",
                        meta: "QC"
                      }
                    ]
                  : []),
                ...(hasTwinbin
                  ? [
                      { key: "__twinbin__", name: "Twinbin", meta: "TWINBIN" }
                    ]
                  : [])
              ]}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => {
                    if (item.key === "__employees__") {
                      navigation.navigate("MyEmployees");
                    } else if (item.key === "__twinbin__") {
                      navigation.navigate(isQc ? "TwinbinQcHome" : "TwinbinHome");
                    } else {
                      openModule(item.key);
                    }
                  }}
                >
                  <Text style={styles.cardTitle}>{item.name || item.key}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.key === "__employees__"
                      ? "View employees for your modules"
                      : item.key === "__twinbin__"
                      ? "Manage Twinbin requests"
                      : `Records: ${counts[item.key] ?? 0}`}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 12 }}
            />
          )}
          {isCityAdmin && (
            <View style={[styles.card, { marginTop: 8 }]}>
              <Text style={styles.cardTitle}>Recent Registration Requests</Text>
              {requestsError ? <Text style={styles.error}>{requestsError}</Text> : null}
              {!requestsError && requests.length === 0 ? (
                <Text style={styles.cardSubtitle}>No registration requests.</Text>
              ) : null}
              {!requestsError &&
                requests.map((r) => (
                  <View key={r.id} style={{ paddingVertical: 4 }}>
                    <Text style={{ fontWeight: "600" }}>{r.name}</Text>
                    <Text style={styles.cardSubtitle}>Status: {r.status}</Text>
                  </View>
                ))}
              <TouchableOpacity
                style={[styles.button, { marginTop: 8, backgroundColor: "#0ea5e9" }]}
                onPress={() => navigation.navigate("RegistrationRequests")}
              >
                <Text style={styles.buttonText}>Manage Requests</Text>
              </TouchableOpacity>
            </View>
          )}
          {isQc ? (
            <TouchableOpacity style={[styles.button, { marginTop: 12, backgroundColor: "#0ea5e9" }]} onPress={() => navigation.navigate("MyEmployees")}>
              <Text style={styles.buttonText}>My Employees</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 24, backgroundColor: "#f5f7fb" },
  welcome: { fontSize: 28, fontWeight: "700", letterSpacing: 2, marginTop: 24 },
  city: { fontSize: 22, marginTop: 8, color: "#1f2937", fontWeight: "600" },
  error: { marginTop: 8, color: "#dc2626" },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardSubtitle: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  button: {
    marginTop: 12,
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    width: "100%",
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "600" }
});
