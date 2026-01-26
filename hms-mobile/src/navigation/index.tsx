import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import CityLandingScreen from "../screens/CityLandingScreen";
import ModuleHomeWrapper from "../screens/modules/ModuleHomeWrapper";
import MyEmployeesScreen from "../screens/MyEmployeesScreen";
import RegistrationRequestsScreen from "../screens/RegistrationRequestsScreen";
import TwinbinHomeScreen from "../screens/TwinbinHomeScreen";
import TwinbinRegisterScreen from "../screens/TwinbinRegisterScreen";
import TwinbinMyRequestsScreen from "../screens/TwinbinMyRequestsScreen";
import TwinbinQcHomeScreen from "../screens/TwinbinQcHomeScreen";
import TwinbinQcPendingScreen from "../screens/TwinbinQcPendingScreen";
import TwinbinQcReviewScreen from "../screens/TwinbinQcReviewScreen";
import TwinbinAssignedScreen from "../screens/TwinbinAssignedScreen";
import TwinbinBinDetailScreen from "../screens/TwinbinBinDetailScreen";
import TwinbinVisitPendingScreen from "../screens/TwinbinVisitPendingScreen";
import TwinbinVisitReviewScreen from "../screens/TwinbinVisitReviewScreen";
import TwinbinActionRequiredScreen from "../screens/TwinbinActionRequiredScreen";
import TwinbinActionRequiredDetailScreen from "../screens/TwinbinActionRequiredDetailScreen";
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
      <Stack.Screen name="TwinbinHome" component={TwinbinHomeScreen} />
      <Stack.Screen name="TwinbinRegister" component={TwinbinRegisterScreen} />
      <Stack.Screen name="TwinbinMyRequests" component={TwinbinMyRequestsScreen} />
      <Stack.Screen name="TwinbinQcHome" component={TwinbinQcHomeScreen} />
      <Stack.Screen name="TwinbinQcPending" component={TwinbinQcPendingScreen} />
      <Stack.Screen name="TwinbinQcReview" component={TwinbinQcReviewScreen} />
      <Stack.Screen name="TwinbinAssigned" component={TwinbinAssignedScreen} />
      <Stack.Screen name="TwinbinBinDetail" component={TwinbinBinDetailScreen} />
      <Stack.Screen name="TwinbinVisitPending" component={TwinbinVisitPendingScreen} />
      <Stack.Screen name="TwinbinVisitReview" component={TwinbinVisitReviewScreen} />
      <Stack.Screen name="TwinbinActionRequired" component={TwinbinActionRequiredScreen} />
      <Stack.Screen name="TwinbinActionRequiredDetail" component={TwinbinActionRequiredDetailScreen} />
    </Stack.Navigator>
  );
}
