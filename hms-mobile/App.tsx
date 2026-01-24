import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./src/navigation";
import { AuthProvider } from "./src/auth/AuthProvider";

export default function App() {
  return (
    <NavigationContainer>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </NavigationContainer>
  );
}
