import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { SWEEPING_QUESTIONS } from "../questions";
import { submitSweepingInspection } from "../../../api/auth";

export default function SweepingInspectionScreen({ route, navigation }: any) {
  const { beat } = route.params;

  const [answers, setAnswers] = useState<any>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const completed = Object.keys(photos).length;

  const takePhoto = async (code: string) => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) return Alert.alert("Camera permission required");

    const r = await ImagePicker.launchCameraAsync({ quality: 0.5 });

    if (!r.canceled) {
      setPhotos(p => ({ ...p, [code]: r.assets[0].uri }));
    }
  };

  // const submit = async () => {
  //   try {
  //     for (const q of SWEEPING_QUESTIONS) {
  //       if (!photos[q.code]) {
  //         return Alert.alert("Photo Required", `Please capture photo for ${q.label}`);
  //       }
  //     }

  //     setSubmitting(true);

  //     const locPerm = await Location.requestForegroundPermissionsAsync();
  //     if (!locPerm.granted) return Alert.alert("Location permission required");

  //     const loc = await Location.getCurrentPositionAsync({});

  //     const payload = SWEEPING_QUESTIONS.map(q => ({
  //       questionCode: q.code,
  //       answer: answers[q.code] ?? false,
  //       photos: [photos[q.code]]
  //     }));

  //     await submitSweepingInspection({
  //       sweepingBeatId: beat.id,
  //       latitude: loc.coords.latitude,
  //       longitude: loc.coords.longitude,
  //       answers: payload
  //     });

  //     Alert.alert("✅ Success", "Inspection submitted");
  //     navigation.goBack();

  //   } catch {
  //     Alert.alert("❌ Error", "Submit failed");
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  const submit = async () => {
    try {
      for (const q of SWEEPING_QUESTIONS) {
        if (!photos[q.code]) {
          return Alert.alert("Photo Required", `Please capture photo for ${q.label}`);
        }
      }

      setSubmitting(true);

      // 🚧 GEO LOCATION REMOVED FOR TESTING
      const payload = SWEEPING_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: answers[q.code] ?? false,
        photos: [photos[q.code]]
      }));

      await submitSweepingInspection({
        sweepingBeatId: beat.id,

        // dummy coords for testing
        latitude: 0,
        longitude: 0,

        answers: payload
      });

      Alert.alert("✅ Success", "Inspection submitted");
      navigation.goBack();

    } catch (e) {
      console.log(e);
      Alert.alert("❌ Error", "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fb" }}>

      {/* Progress */}
      <View style={{ padding: 12 }}>
        <Text style={{ textAlign: "center", fontWeight: "600" }}>
          Photos captured: {completed} / {SWEEPING_QUESTIONS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>

        {SWEEPING_QUESTIONS.map((q, i) => (
          <View key={q.code} style={{ backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 12 }}>

            <Text style={{ fontWeight: "700" }}>{i + 1}. {q.label}</Text>
            <Text style={{ color: "#6b7280" }}>{q.hi}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>

              {(q.type === "boolean"
                ? ["Yes", "No"]
                : q.options || []
              ).map((v: string) => {

                const value = q.type === "boolean" ? v === "Yes" : v;

                return (
                  <TouchableOpacity
                    key={v}
                    onPress={() =>
                      setAnswers({
                        ...answers,
                        [q.code]: value
                      })
                    }
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      marginRight: 6,
                      marginBottom: 6,
                      backgroundColor:
                        answers[q.code] === value ? "#dcfce7" : "#f1f5f9",
                      minWidth: "45%"
                    }}
                  >
                    <Text style={{ textAlign: "center" }}>{v}</Text>
                  </TouchableOpacity>
                );
              })}

            </View>


            {photos[q.code] && (
              <Image source={{ uri: photos[q.code] }} style={{ width: "100%", height: 160, marginTop: 8, borderRadius: 10 }} />
            )}

            <TouchableOpacity
              onPress={() => takePhoto(q.code)}
              style={{ backgroundColor: "#e5e7eb", padding: 10, borderRadius: 8, marginTop: 8 }}
            >
              <Text style={{ textAlign: "center" }}>
                {photos[q.code] ? "📸 Retake Photo" : "📷 Capture Photo"}
              </Text>
            </TouchableOpacity>

          </View>
        ))}

      </ScrollView>

      <View style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}>
        <TouchableOpacity
          disabled={submitting}
          onPress={submit}
          style={{
            backgroundColor: submitting ? "#94a3b8" : "#2563eb",
            padding: 16,
            borderRadius: 14,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {submitting ? "Submitting..." : "Submit Inspection"}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}
