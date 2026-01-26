import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinHome">;

export default function TwinbinHomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Twinbin - Employee</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Register Litter Bin</Text>
        <Text style={styles.cardSubtitle}>Submit a new twinbin request with location and condition.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinRegister")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Bin Requests</Text>
        <Text style={styles.cardSubtitle}>View status of your submitted requests.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinMyRequests")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assigned Bins</Text>
        <Text style={styles.cardSubtitle}>View bins assigned to you and check-in on site.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("TwinbinAssigned")}>
          <Text style={styles.buttonText}>Open</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { color: "#475569", marginVertical: 6 },
  button: {
    marginTop: 8,
    backgroundColor: "#1d4ed8",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" }
});
