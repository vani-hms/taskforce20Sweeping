import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen, RegisterScreen } from "../modules/auth";
import { CityLandingScreen, MyEmployeesScreen, RegistrationRequestsScreen } from "../modules/city";
import { ModuleHomeWrapper } from "../modules/common";
import {
  TwinbinHomeScreen,
  TwinbinRegisterScreen,
  TwinbinMyRequestsScreen,
  TwinbinQcHomeScreen,
  TwinbinQcPendingScreen,
  TwinbinQcReviewScreen,
  TwinbinAssignedScreen,
  TwinbinBinDetailScreen,
  TwinbinVisitPendingScreen,
  TwinbinVisitReviewScreen,
  TwinbinActionRequiredScreen,
  TwinbinActionRequiredDetailScreen,
  TwinbinReportPendingScreen,
  TwinbinReportReviewScreen
} from "../modules/twinbin";
import {
  TaskforceHomeScreen,
  TaskforceRegisterScreen,
  TaskforceMyRequestsScreen,
  TaskforceAssignedScreen,
  TaskforceFeederDetailScreen,
  TaskforceQcReportsScreen,
  TaskforceQcReportReviewScreen
} from "../modules/taskforce";
import { useAuthContext } from "../auth/AuthProvider";
import { RootStackParamList } from "./types";
export type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { auth } = useAuthContext();

  if (auth.status === "loading") {
    return null;
  }

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
      <Stack.Screen
        name="CityLanding"
        component={CityLandingScreen}
        initialParams={{ cityName: auth.status === "authenticated" ? auth.cityName : undefined }}
      />
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
      <Stack.Screen name="TwinbinReportPending" component={TwinbinReportPendingScreen} />
      <Stack.Screen name="TwinbinReportReview" component={TwinbinReportReviewScreen} />
      <Stack.Screen name="TaskforceHome" component={TaskforceHomeScreen} />
      <Stack.Screen name="TaskforceRegister" component={TaskforceRegisterScreen} />
      <Stack.Screen name="TaskforceMyRequests" component={TaskforceMyRequestsScreen} />
      <Stack.Screen name="TaskforceAssigned" component={TaskforceAssignedScreen} />
      <Stack.Screen name="TaskforceFeederDetail" component={TaskforceFeederDetailScreen} />
      <Stack.Screen name="TaskforceQcReports" component={TaskforceQcReportsScreen} />
      <Stack.Screen name="TaskforceQcReportReview" component={TaskforceQcReportReviewScreen} />
    </Stack.Navigator>
  );
}
