import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useAuthContext } from "../navigation/authContext";
import { fetchCityInfo } from "../api/auth";
import { getSession } from "../auth/session";

type Props = NativeStackScreenProps<RootStackParamList, "CityLanding">;

export default function CityLandingScreen({ route }: Props) {
  const { auth, logout } = useAuthContext();
  const [cityName, setCityName] = useState(
    route.params?.cityName ?? (auth.status === "authenticated" ? auth.cityName : "")
  );
  const [loading, setLoading] = useState(!cityName);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session.token) {
      logout();
      return;
    }
    if (cityName) {
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { city } = await fetchCityInfo();
        setCityName(city.name);
      } catch {
        setError("Failed to load city");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cityName, logout]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1d4ed8" />
      ) : (
        <>
          <Text style={styles.welcome}>WELCOME</Text>
          <Text style={styles.city}>{cityName || "Your City"}</Text>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#f5f7fb" },
  welcome: { fontSize: 28, fontWeight: "700", letterSpacing: 2 },
  city: { fontSize: 22, marginTop: 8, color: "#1f2937", fontWeight: "600" },
  button: { marginTop: 32, backgroundColor: "#1d4ed8", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { marginTop: 12, color: "#dc2626" }
});
