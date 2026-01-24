import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CityLandingScreen from "../screens/CityLandingScreen";
import ModuleHomeWrapper from "../screens/modules/ModuleHomeWrapper";
import MyEmployeesScreen from "../screens/MyEmployeesScreen";
import RegistrationRequestsScreen from "../screens/RegistrationRequestsScreen";
import { useAuthContext } from "../auth/AuthProvider";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { auth } = useAuthContext();

  if (auth.status === "guest") {
    return (
      <Stack.Navigator key="guest" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator key="app" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CityLanding" component={CityLandingScreen} initialParams={{ cityName: auth.cityName }} />
      <Stack.Screen name="Module" component={ModuleHomeWrapper} />
      <Stack.Screen name="MyEmployees" component={MyEmployeesScreen} />
      <Stack.Screen name="RegistrationRequests" component={RegistrationRequestsScreen} />
    </Stack.Navigator>
  );
}
