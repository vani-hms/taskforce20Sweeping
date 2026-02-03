import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import { sweepingQcDecision } from "../../../api/auth";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SWEEPING_QUESTIONS } from "../questions";
import { Layout, Typography } from "../../../theme";

const STATUS_COLOR: any = {
  SUBMITTED: "#fde68a",
  ACTION_SUBMITTED: "#dbeafe",
  APPROVED: "#dcfce7",
  REJECTED: "#fee2e2",
  ACTION_REQUIRED: "#fed7aa"
};

export default function QcSweepingDetail() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { inspection } = route.params;
  const [acting, setActing] = useState(false);

  const act = async (decision: "APPROVED" | "REJECTED" | "ACTION_REQUIRED") => {
    if (inspection.status === "APPROVED" || inspection.status === "REJECTED")
      return Alert.alert("Already Closed");

    Alert.alert(
      "Confirm",
      `Are you sure you want to ${decision.replace("_", " ")} this inspection?`,
      [
        { text: "Cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              setActing(true);
              await sweepingQcDecision(inspection.id, decision);
              Alert.alert("Success", "Decision saved");
              navigation.goBack();
            } finally {
              setActing(false);
            }
          }
        }
      ]
    );
  };

  const getLabel = (code: string) =>
    SWEEPING_QUESTIONS.find(q => q.code === code)?.label || code;

  const getHindi = (code: string) =>
    SWEEPING_QUESTIONS.find(q => q.code === code)?.hi || "";

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>

      <Text style={Typography.h2}>Inspection Review</Text>

      {/* STATUS */}
      <View
        style={{
          alignSelf: "flex-start",
          marginVertical: 10,
          backgroundColor: STATUS_COLOR[inspection.status] || "#e5e7eb",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 10
        }}
      >
        <Text>{inspection.status.replace("_", " ")}</Text>
      </View>

      {/* BASIC INFO */}
      <View style={Layout.card}>
        <Text style={{ fontWeight: "600" }}>
          Beat: {inspection.sweepingBeat?.geoNodeBeat?.name}
        </Text>
        <Text style={{ marginTop: 4 }}>
          Employee: {inspection.employee?.name}
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          {new Date(inspection.createdAt).toLocaleString()}
        </Text>
      </View>

      {/* ANSWERS */}
      <Text style={styles.section}>Inspection Answers</Text>

      {inspection.answers.map((a: any) => (
        <View key={a.id} style={styles.answer}>
          <Text style={{ fontWeight: "600" }}>{getLabel(a.questionCode)}</Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            {getHindi(a.questionCode)}
          </Text>
          <Text style={{ marginTop: 4 }}>
            {typeof a.answer === "boolean"
              ? a.answer
                ? "Yes"
                : "No"
              : a.answer}
          </Text>
        </View>
      ))}

      {/* PHOTOS */}
      <Text style={styles.section}>Photo Evidence</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {inspection.photos.map((p: any) => (
          <Image
            key={p.id}
            source={{ uri: p.photoUrl }}
            style={{ width: 100, height: 100, margin: 4, borderRadius: 8 }}
          />
        ))}
      </View>

      {/* ACTIONS */}
      {acting && <ActivityIndicator style={{ marginTop: 10 }} />}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#16a34a" }]}
          onPress={() => act("APPROVED")}
        >
          <Text style={styles.txt}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#dc2626" }]}
          onPress={() => act("REJECTED")}
        >
          <Text style={styles.txt}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#f59e0b" }]}
          onPress={() => act("ACTION_REQUIRED")}
        >
          <Text style={styles.txt}>Action Required</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: "700", marginTop: 16 },
  answer: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 8
  },
  actions: { marginTop: 20 },
  btn: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: "center"
  },
  txt: { color: "#fff", fontWeight: "600" }
});
