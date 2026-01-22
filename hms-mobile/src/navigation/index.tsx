import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import CityLandingScreen from "../screens/CityLandingScreen";
import { fetchCityInfo } from "../api/auth";
import { clearToken, getToken, saveToken } from "../auth/storage";
import { clearSession, decodeJwt, setSession } from "../auth/session";
import { AuthContext, AuthState } from "./authContext";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  const hydrate = async () => {
    try {
      const token = await getToken();
      if (!token) {
        await clearSession();
        setAuth({ status: "guest" });
        return;
      }
      const decoded = decodeJwt(token);
      setSession({ token, roles: decoded.roles, cityId: decoded.cityId });
      const info = await fetchCityInfo();
      setSession({ token, roles: decoded.roles, cityId: decoded.cityId, cityName: info.city.name });
      setAuth({ status: "authenticated", cityName: info.city.name, roles: decoded.roles, cityId: decoded.cityId });
    } catch (err: any) {
      await clearSession();
      await clearToken();
      setAuth({ status: "guest" });
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  const completeLogin = async (token: string, cityName?: string) => {
    await saveToken(token);
    const decoded = decodeJwt(token);
    setSession({ token, roles: decoded.roles, cityId: decoded.cityId, cityName });
    if (!cityName) {
      try {
        const info = await fetchCityInfo();
        cityName = info.city.name;
        setSession({ token, roles: decoded.roles, cityId: decoded.cityId, cityName });
      } catch {
        // ignore; fallback to decoded city if any
      }
    }
    setAuth({ status: "authenticated", cityName, roles: decoded.roles, cityId: decoded.cityId });
  };

  const logout = async () => {
    await clearToken();
    await clearSession();
    setAuth({ status: "guest" });
  };

  const value = useMemo(() => ({ auth, completeLogin, logout }), [auth]);

  if (auth.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {auth.status === "guest" ? (
        <Stack.Navigator key="guest" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator key="app" screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="CityLanding"
            component={CityLandingScreen}
            initialParams={{ cityName: auth.cityName }}
          />
        </Stack.Navigator>
      )}
    </AuthContext.Provider>
  );
}
