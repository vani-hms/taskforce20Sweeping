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

import SweepingBeatsScreen from "../modules/sweeping/screens/SweepingBeatsScreen";
import SweepingInspectionScreen from "../modules/sweeping/screens/SweepingInspectionScreen";
import QcSweepingList from "../modules/sweeping/screens/QcSweepingList";
import QcSweepingDetail from "../modules/sweeping/screens/QcSweepingDetail";
import QcSweepingHome from "../modules/sweeping/screens/QcSweepingHome";
import ActionOfficerSweepingScreen from "../modules/sweeping/screens/ActionOfficerSweepingScreen";
import QcBeatAssignmentScreen from "../modules/sweeping/screens/QcBeatAssignmentScreen";
import EmployeeInspectionHistory from "../modules/sweeping/screens/EmployeeInspectionHistory";

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
        initialParams={{ cityName: auth.status === "authenticated" ? auth.cityName : undefined }}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Module" component={ModuleHomeWrapper} options={{ headerShown: false }} />
      <Stack.Screen name="MyEmployees" component={MyEmployeesScreen} options={{ title: "My Employees" }} />
      <Stack.Screen name="RegistrationRequests" component={RegistrationRequestsScreen} options={{ title: "Registration Requests" }} />
{/* Twinbin */}
<Stack.Screen name="TwinbinHome" component={TwinbinHomeScreen} options={{ title: "Litter Bins" }} />
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

{/* Taskforce */}
<Stack.Screen name="TaskforceHome" component={TaskforceHomeScreen} />
<Stack.Screen name="TaskforceRegister" component={TaskforceRegisterScreen} />
<Stack.Screen name="TaskforceMyRequests" component={TaskforceMyRequestsScreen} />
<Stack.Screen name="TaskforceAssigned" component={TaskforceAssignedScreen} />
<Stack.Screen name="TaskforceFeederDetail" component={TaskforceFeederDetailScreen} />
<Stack.Screen name="TaskforceQcReports" component={TaskforceQcReportsScreen} />
<Stack.Screen name="TaskforceQcReportReview" component={TaskforceQcReportReviewScreen} />

{/* Sweeping */}
<Stack.Screen name="SweepingBeats" component={SweepingBeatsScreen} />
<Stack.Screen name="SweepingInspection" component={SweepingInspectionScreen} />
<Stack.Screen name="QcSweepingHome" component={QcSweepingHome} />
<Stack.Screen name="QcSweepingList" component={QcSweepingList} />
<Stack.Screen name="QcSweepingDetail" component={QcSweepingDetail} />
<Stack.Screen name="ActionOfficerSweeping" component={ActionOfficerSweepingScreen}/>
<Stack.Screen name="QcBeatAssignment" component={QcBeatAssignmentScreen} />
<Stack.Screen name="EmployeeInspectionHistory" component={EmployeeInspectionHistory} />

{/* Toilets (from main) */}
<Stack.Screen name="ToiletHome" component={ToiletHomeScreen} />
<Stack.Screen name="ToiletEmployeeTabs" component={ToiletEmployeeTabs} />
<Stack.Screen name="ToiletQcTabs" component={ToiletQcTabs} />
<Stack.Screen name="ToiletInspection" component={ToiletInspectionScreen} />
<Stack.Screen name="ToiletReview" component={ToiletReviewScreen} />
<Stack.Screen name="ToiletRegister" component={ToiletRegisterScreen} />
<Stack.Screen name="ToiletMyRequests" component={ToiletMyRequestsScreen} />
<Stack.Screen name="ToiletPendingRegistration" component={ToiletPendingRegistrationScreen} />
<Stack.Screen name="ToiletMaster" component={ToiletMasterScreen} />
<Stack.Screen name="ToiletHelp" component={ToiletHelpScreen} />
    </Stack.Navigator>
  );

}
