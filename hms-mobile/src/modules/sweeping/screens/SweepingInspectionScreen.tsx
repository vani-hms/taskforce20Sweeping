import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import * as Location from "expo-location";
import { SWEEPING_QUESTIONS } from "../questions";
import { submitSweepingInspection } from "../../../api/auth";

export default function SweepingInspectionScreen({ route, navigation }: any) {
  const { beat } = route.params;
  const [answers, setAnswers] = useState<any>({});

  const submit = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});

      const payload = SWEEPING_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer:
          q.type === "boolean"
            ? answers[q.code] === true
            : true,
        photos: []
      }));

      await submitSweepingInspection({
        sweepingBeatId: beat.id,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        answers: payload
      });

      alert("✅ Inspection submitted");
      navigation.goBack();
    } catch {
      alert("❌ Submit failed");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fb" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>

        {SWEEPING_QUESTIONS.map((q, i) => (
          <View
            key={q.code}
            style={{
              backgroundColor: "#fff",
              padding: 14,
              borderRadius: 12,
              marginBottom: 12,
              elevation: 2
            }}
          >
            <Text style={{ fontWeight: "600" }}>
              {i + 1}. {q.label}
            </Text>

            <Text style={{ color: "#6b7280", marginBottom: 8 }}>
              {q.hi}
            </Text>

            {/* BOOLEAN */}
            {q.type === "boolean" && (
              <View style={{ flexDirection: "row" }}>
                {["Yes", "No"].map(v => (
                  <TouchableOpacity
                    key={v}
                    onPress={() =>
                      setAnswers({ ...answers, [q.code]: v === "Yes" })
                    }
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      marginRight: v === "Yes" ? 8 : 0,
                      backgroundColor:
                        answers[q.code] === (v === "Yes")
                          ? "#dcfce7"
                          : "#f1f5f9"
                    }}
                  >
                    <Text style={{ textAlign: "center" }}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* CHOICE */}
            {q.type === "choice" && (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {q.options?.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setAnswers({ ...answers, [q.code]: opt })}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor:
                        answers[q.code] === opt ? "#dbeafe" : "#f1f5f9",
                      marginRight: 8,
                      marginBottom: 8
                    }}
                  >
                    <Text>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* TEXT INPUT */}
            {q.type === "text" && (
              <TextInput
                placeholder="Type here..."
                value={answers[q.code] || ""}
                onChangeText={t => setAnswers({ ...answers, [q.code]: t })}
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 8,
                  padding: 10
                }}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {/* SUBMIT */}
      <View style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}>
        <TouchableOpacity
          onPress={submit}
          style={{
            backgroundColor: "#2563eb",
            padding: 16,
            borderRadius: 14,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
            Submit Inspection
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
