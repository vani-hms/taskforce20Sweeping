import { Platform } from "react-native";
import Constants from "expo-constants";

function resolveFromExpoHost(): string | null {
  // Metro provides host:port in expoConfig.hostUri during development
  const hostUri = Constants?.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(":")[0];
  if (!host) return null;
  return `http://${host}:4000`;
}

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  const expoHostUrl = resolveFromExpoHost();
  if (expoHostUrl) return expoHostUrl;

  // Android emulator maps host machine to 10.0.2.2
  if (Platform.OS === "android") return "http://10.0.2.2:4000";

  // iOS simulator can hit localhost directly
  return "http://localhost:4000";
}

export const API_BASE_URL = getApiBaseUrl();
