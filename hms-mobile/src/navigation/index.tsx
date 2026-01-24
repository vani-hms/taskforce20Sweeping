import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import CityLandingScreen from "../screens/CityLandingScreen";
import ModuleHomeWrapper from "../screens/modules/ModuleHomeWrapper";
import { useAuthContext } from "../auth/AuthProvider";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { auth } = useAuthContext();

  if (auth.status === "guest") {
    return (
      <Stack.Navigator key="guest" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator key="app" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CityLanding" component={CityLandingScreen} initialParams={{ cityName: auth.cityName }} />
      <Stack.Screen name="Module" component={ModuleHomeWrapper} />
    </Stack.Navigator>
  );
}
