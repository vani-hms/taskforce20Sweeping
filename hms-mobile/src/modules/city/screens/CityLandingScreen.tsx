import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../navigation";
import { useAuthContext } from "../../../auth/AuthProvider";
import { fetchCityInfo } from "../../../api/auth";
import { getSession } from "../../../auth/session";
import { ModuleRecordsApi } from "../../../api/modules";
import { listRegistrationRequests } from "../../../api/auth";
import { normalizeModuleKey } from "../../common/moduleUtils";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { LayoutDashboard, Users, LogOut, ChevronRight, FileText } from "lucide-react-native";

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

  const rawModules = auth.status === "authenticated" && auth.modules ? auth.modules : [];

  // Deduplicate modules
  const modules = React.useMemo(() => {
    const seen = new Set<string>();
    return rawModules
      .map((m) => {
        let key = normalizeModuleKey(m.key);
        // FORCE NORMALIZE: twinbin -> LITTERBINS
        if (key === "TWINBIN") key = "LITTERBINS";

        return { ...m, key, name: key === "LITTERBINS" ? "Litter Bins" : m.name };
      })
      .filter((m) => {
        if (seen.has(m.key)) return false;
        seen.add(m.key);
        return true;
      });
  }, [rawModules]);
  const roles = auth.status === "authenticated" && auth.roles ? auth.roles : [];
  const isQc = roles.includes("QC");
  const isCityAdmin = roles.includes("CITY_ADMIN");

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

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.city}>{cityName || "Your City"}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      <FlatList
        data={[
          ...modules,
          ...(isQc
            ? [
              {
                key: "__employees__",
                name: "Employees",
                meta: "QC"
              }
            ]
            : [])
        ]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={Typography.h3}>No modules assigned</Text>
            <Text style={Typography.body}>Contact your administrator.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={Layout.card}
            onPress={() => {
              if (item.key === "__employees__") {
                navigation.navigate("MyEmployees");
              } else {
                openModule(item.key);
              }
            }}
          >
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, { backgroundColor: item.key === "__employees__" ? Colors.secondary : Colors.primaryLight }]}>
                {item.key === "__employees__" ? (
                  <Users size={24} color={Colors.white} />
                ) : (
                  <LayoutDashboard size={24} color={Colors.primary} />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={Typography.h3}>{item.name}</Text>
                <Text style={Typography.caption}>
                  {item.key === "__employees__" ? "View Employees" : `Records: ${counts[item.key] ?? 0}`}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.m }} />}
      />

      {isCityAdmin && (
        <View style={[Layout.card, { marginTop: Spacing.l }]}>
          <View style={styles.cardRow}>
            <FileText size={24} color={Colors.warning} />
            <View style={styles.cardContent}>
              <Text style={Typography.h3}>Registration Requests</Text>
            </View>
          </View>

          {requestsError ? <Text style={styles.errorText}>{requestsError}</Text> : null}

          {!requestsError && requests.map((r) => (
            <View key={r.id} style={styles.reqRow}>
              <Text style={Typography.body}>{r.name}</Text>
              <Text style={[Typography.caption, { color: Colors.primary }]}>{r.status}</Text>
            </View>
          ))}

          {requests.length === 0 && !requestsError ? <Text style={Typography.muted}>No pending requests</Text> : null}

          <TouchableOpacity
            style={[UI.button, UI.buttonPrimary, { marginTop: Spacing.m }]}
            onPress={() => navigation.navigate("RegistrationRequests")}
          >
            <Text style={UI.buttonTextPrimary}>Manage Requests</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: Layout.screenContainer,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
    marginTop: Spacing.m // Safe area top
  },
  welcome: {
    ...Typography.caption,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  city: {
    ...Typography.h1,
    color: Colors.primary
  },
  logoutBtn: {
    padding: Spacing.s,
    backgroundColor: Colors.dangerBg,
    borderRadius: 8
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  cardContent: {
    flex: 1
  },
  errorBox: {
    backgroundColor: Colors.dangerBg,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14
  },
  emptyCard: {
    alignItems: "center",
    padding: Spacing.xl
  },
  reqRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  }
});
