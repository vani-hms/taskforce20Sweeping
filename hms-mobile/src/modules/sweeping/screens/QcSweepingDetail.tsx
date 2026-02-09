import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet
} from "react-native";
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
    <ScrollView contentContainerStyle={styles.container}>

      {/* Header */}

      <View style={styles.headerCard}>
        <Text style={styles.beat}>{inspection.sweepingBeat?.geoNodeBeat?.name}</Text>
        <Text style={styles.employee}>👤 {inspection.employee?.name}</Text>
      </View>

      {/* Answers */}

      <Text style={styles.section}>Inspection Answers</Text>

      {inspection.answers.map((a: any, idx: number) => (
        <View key={idx} style={styles.answerCard}>
          <Text style={styles.question}>{a.questionCode}</Text>

          <View style={[
            styles.answerBadge,
            { backgroundColor: a.answer ? "#dcfce7" : "#fee2e2" }
          ]}>
            <Text style={{
              color: a.answer ? "#166534" : "#991b1b",
              fontWeight: "700"
            }}>
              {a.answer ? "YES" : "NO"}
            </Text>
          </View>
        </View>
      ))}

      {/* Photos */}

      <Text style={styles.section}>Photo Evidence</Text>

      <View style={styles.photoGrid}>
        {inspection.photos?.length === 0 && (
          <Text style={{ color: "#64748b" }}>No photos</Text>
        )}

        {inspection.photos?.map((p: any, idx: number) => (
          <Image
            key={idx}
            source={{ uri: p.photoUrl }}
            style={styles.photo}
          />
        ))}
      </View>

      {/* Actions */}

      <View style={styles.actions}>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#16a34a" }]}
          onPress={() => act("APPROVED")}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#dc2626" }]}
          onPress={() => act("REJECTED")}
        >
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#f59e0b" }]}
          onPress={() => act("ACTION_REQUIRED")}
        >
          <Text style={styles.btnText}>Action Required</Text>
        </TouchableOpacity>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40
  },

  headerCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },

  beat: {
    fontSize: 18,
    fontWeight: "800"
  },

  employee: {
    marginTop: 4,
    color: "#64748b"
  },

  section: {
    marginTop: 20,
    marginBottom: 6,
    fontWeight: "800",
    fontSize: 15
  },

  answerCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },

  question: {
    fontWeight: "600",
    marginBottom: 6
  },

  answerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8
  },

  photo: {
    width: 100,
    height: 100,
    borderRadius: 10,
    margin: 4
  },

  actions: {
    marginTop: 28
  },

  btn: {
    padding: 14,
    borderRadius: 12,
    marginVertical: 6,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "700"
  }
});
