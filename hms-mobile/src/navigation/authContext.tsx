import React, { createContext, useContext } from "react";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; cityName?: string; roles?: string[]; cityId?: string };

export type AuthContextType = {
  auth: AuthState;
  completeLogin: (token: string, cityName?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext not found");
  return ctx;
}
