'use client';

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthCookie, decodeToken, getTokenFromCookies, setAuthCookie } from "@lib/auth";
import { AuthUser } from "@types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getTokenFromCookies();
    setUser(decodeToken(token));
    setLoading(false);
  }, []);

  const logout = () => {
    clearAuthCookie();
    setUser(null);
  };

  const value = useMemo(() => ({ user, setUser, logout, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
