import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from "react-native";
import { sweepingQcDecision } from "../../../api/auth";
import { useRoute, useNavigation } from "@react-navigation/native";

export default function QcSweepingDetail() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { inspection } = route.params;

  const act = async (decision: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
    await sweepingQcDecision(inspection.id, decision);
    navigation.goBack();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Beat</Text>
      <Text>{inspection.sweepingBeat?.geoNodeBeat?.name}</Text>

      <Text style={styles.title}>Employee</Text>
      <Text>{inspection.employee?.name}</Text>

      <Text style={styles.title}>Answers</Text>

      {inspection.answers.map((a: any) => (
        <View key={a.id} style={styles.answer}>
          <Text>{a.questionCode}</Text>
          <Text>{a.answer ? "YES" : "NO"}</Text>
        </View>
      ))}

      <Text style={styles.title}>Photos</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {inspection.photos.map((p: any) => (
          <Image
            key={p.id}
            source={{ uri: p.photoUrl }}
            style={{ width: 100, height: 100, margin: 4 }}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: "#16a34a" }]} onPress={() => act("APPROVED")}>
          <Text style={styles.txt}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { backgroundColor: "#dc2626" }]} onPress={() => act("REJECTED")}>
          <Text style={styles.txt}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { backgroundColor: "#f59e0b" }]} onPress={() => act("ACTION_REQUIRED")}>
          <Text style={styles.txt}>Action Required</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  answer: { padding: 6, borderBottomWidth: 1, borderColor: "#eee" },
  actions: { marginTop: 20 },
  btn: { padding: 12, borderRadius: 8, marginVertical: 6, alignItems: "center" },
  txt: { color: "#fff", fontWeight: "600" }
});
