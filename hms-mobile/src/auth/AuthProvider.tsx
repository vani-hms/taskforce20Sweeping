import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { fetchCityInfo } from "../api/auth";
import { clearToken, getToken, saveToken } from "./storage";
import { clearSession, decodeJwt, setSession, ModuleAccess } from "./session";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; cityName?: string; roles?: string[]; cityId?: string; modules?: ModuleAccess[] };

type AuthContextType = {
  auth: AuthState;
  completeLogin: (token: string, cityName?: string, modules?: ModuleAccess[]) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext not found");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

      const roles =
        decoded.roles ||
        decoded.modules?.flatMap((m: any) => m.roles || []) ||
        [];

      setSession({ token, roles, cityId: decoded.cityId, modules: decoded.modules });

      const info = await fetchCityInfo();

      setSession({
        token,
        roles,
        cityId: decoded.cityId,
        cityName: info.city.name,
        modules: decoded.modules
      });

      setAuth({
        status: "authenticated",
        cityName: info.city.name,
        roles,
        cityId: decoded.cityId,
        modules: decoded.modules
      });
    } catch {
      await clearSession();
      await clearToken();
      setAuth({ status: "guest" });
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  const completeLogin = async (token: string, cityName?: string, modules?: ModuleAccess[]) => {
    await saveToken(token);

    const decoded = decodeJwt(token);

    const roles =
      decoded.roles ||
      decoded.modules?.flatMap((m: any) => m.roles || []) ||
      [];

    setSession({ token, roles, cityId: decoded.cityId, cityName, modules: modules || decoded.modules });

    if (!cityName) {
      try {
        const info = await fetchCityInfo();
        cityName = info.city.name;

        setSession({
          token,
          roles,
          cityId: decoded.cityId,
          cityName,
          modules: modules || decoded.modules
        });
      } catch {}
    }

    setAuth({
      status: "authenticated",
      cityName,
      roles,
      cityId: decoded.cityId,
      modules: modules || decoded.modules
    });
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
