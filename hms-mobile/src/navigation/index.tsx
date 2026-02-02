import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen, RegisterScreen } from "../modules/auth";
import {
  CityLandingScreen,
  MyEmployeesScreen,
  RegistrationRequestsScreen,
} from "../modules/city";

import { ModuleHomeWrapper } from "../modules/common";

import {
  TwinbinHomeScreen,
  TwinbinRegisterScreen,
  TwinbinMyRequestsScreen,
  TwinbinQcHomeScreen,
  TwinbinQcPendingScreen,
  TwinbinQcReviewScreen,
  TwinbinQcApprovedScreen,
  TwinbinQcAssignScreen,
  TwinbinAssignedScreen,
  TwinbinBinDetailScreen,
  TwinbinVisitPendingScreen,
  TwinbinVisitReviewScreen,
  TwinbinActionRequiredScreen,
  TwinbinActionRequiredDetailScreen,
  TwinbinReportPendingScreen,
  TwinbinReportReviewScreen,
} from "../modules/twinbin";

import {
  TaskforceHomeScreen,
  TaskforceRegisterScreen,
  TaskforceMyRequestsScreen,
  TaskforceAssignedScreen,
  TaskforceFeederDetailScreen,
  TaskforceQcReportsScreen,
  TaskforceQcReportReviewScreen,
} from "../modules/taskforce";

/* ✅ Cleanliness Of Toilets Module (ADDED ONLY) */
import {
  ToiletHomeScreen,
  ToiletEmployeeTabs,
  ToiletQcTabs,
  ToiletInspectionScreen,
  ToiletReviewScreen,
  ToiletRegisterScreen,
  ToiletMyRequestsScreen,
  ToiletPendingRegistrationScreen,
  ToiletMasterScreen,
  ToiletHelpScreen,
} from "../modules/cleanlinessOfToilets";

import { useAuthContext } from "../auth/AuthProvider";
import { RootStackParamList } from "./types";
import { Colors, Typography } from "../theme";
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
    <Stack.Navigator
      key="app"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: "700", color: Colors.primary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background }
      }}
    >
      <Stack.Screen
        name="CityLanding"
        component={CityLandingScreen}
        initialParams={{
          cityName:
            auth.status === "authenticated" ? auth.cityName : undefined,
        }}
        options={{ headerShown: false }}
      />

      <Stack.Screen name="Module" component={ModuleHomeWrapper} options={{ headerShown: false }} />
      <Stack.Screen name="MyEmployees" component={MyEmployeesScreen} options={{ title: "My Employees" }} />
      <Stack.Screen
        name="RegistrationRequests"
        component={RegistrationRequestsScreen}
        options={{ title: "Registration Requests" }}
      />

      {/* Twinbin */}
      <Stack.Screen name="TwinbinHome" component={TwinbinHomeScreen} options={{ title: "Litter Bins" }} />
      <Stack.Screen name="TwinbinRegister" component={TwinbinRegisterScreen} options={{ title: "Register Bin" }} />
      <Stack.Screen
        name="TwinbinMyRequests"
        component={TwinbinMyRequestsScreen}
        options={{ title: "My Requests" }}
      />
      <Stack.Screen name="TwinbinQcHome" component={TwinbinQcHomeScreen} options={{ title: "Litter Bins QC" }} />

      <Stack.Screen
        name="TwinbinQcPending"
        component={TwinbinQcPendingScreen}
        options={{ title: "Pending Bins" }}
      />
      <Stack.Screen
        name="TwinbinQcReview"
        component={TwinbinQcReviewScreen}
        options={{ title: "Review Bin" }}
      />
      <Stack.Screen
        name="TwinbinAssigned"
        component={TwinbinAssignedScreen}
        options={{ title: "Assigned Bins" }}
      />
      <Stack.Screen
        name="TwinbinBinDetail"
        component={TwinbinBinDetailScreen}
        options={{ title: "Bin Detail" }}
      />
      <Stack.Screen
        name="TwinbinVisitPending"
        component={TwinbinVisitPendingScreen}
        options={{ title: "Pending Visits" }}
      />
      <Stack.Screen
        name="TwinbinVisitReview"
        component={TwinbinVisitReviewScreen}
        options={{ title: "Review Visit" }}
      />
      <Stack.Screen
        name="TwinbinActionRequired"
        component={TwinbinActionRequiredScreen}
        options={{ title: "Action Required" }}
      />
      <Stack.Screen
        name="TwinbinActionRequiredDetail"
        component={TwinbinActionRequiredDetailScreen}
        options={{ title: "Action Detail" }}
      />
      <Stack.Screen
        name="TwinbinReportPending"
        component={TwinbinReportPendingScreen}
        options={{ title: "Pending Reports" }}
      />
      <Stack.Screen
        name="TwinbinReportReview"
        component={TwinbinReportReviewScreen}
        options={{ title: "Review Report" }}
      />

      {/* Taskforce */}
      <Stack.Screen name="TaskforceHome" component={TaskforceHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskforceRegister"
        component={TaskforceRegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskforceMyRequests"
        component={TaskforceMyRequestsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskforceAssigned"
        component={TaskforceAssignedScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskforceFeederDetail"
        component={TaskforceFeederDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskforceQcReports"
        component={TaskforceQcReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskforceQcReportReview"
        component={TaskforceQcReportReviewScreen}
        options={{ headerShown: false }}
      />

      {/* ✅ Cleanliness Of Toilets (ADDED) */}
      <Stack.Screen name="ToiletHome" component={ToiletHomeScreen} options={{ title: "Toilets" }} />
      <Stack.Screen
        name="ToiletEmployeeTabs"
        component={ToiletEmployeeTabs}
        options={{ title: "Daily Operations" }}
      />
      <Stack.Screen name="ToiletQcTabs" component={ToiletQcTabs} options={{ title: "QC Dashboard" }} />
      <Stack.Screen
        name="ToiletInspection"
        component={ToiletInspectionScreen}
        options={{ title: "Inspection" }}
      />
      <Stack.Screen name="ToiletReview" component={ToiletReviewScreen} options={{ title: "Review" }} />
      <Stack.Screen name="ToiletRegister" component={ToiletRegisterScreen} options={{ title: "Register Toilet" }} />
      <Stack.Screen
        name="ToiletMyRequests"
        component={ToiletMyRequestsScreen}
        options={{ title: "My Requests" }}
      />
      <Stack.Screen
        name="ToiletPendingRegistration"
        component={ToiletPendingRegistrationScreen}
        options={{ title: "Pending" }}
      />
      <Stack.Screen name="ToiletMaster" component={ToiletMasterScreen} options={{ title: "All Toilets" }} />
      <Stack.Screen name="ToiletHelp" component={ToiletHelpScreen} options={{ title: "Help" }} />
    </Stack.Navigator>
  );
}
