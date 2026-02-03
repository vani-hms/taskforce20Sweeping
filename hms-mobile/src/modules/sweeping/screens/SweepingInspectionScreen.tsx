// import React, { useEffect, useState } from "react";

// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Image,
//   ActivityIndicator,
//   Alert
// } from "react-native";
// import * as Location from "expo-location";
// import * as ImagePicker from "expo-image-picker";
// import { SWEEPING_QUESTIONS } from "../questions";
// import { submitSweepingInspection } from "../../../api/auth";

// export default function SweepingInspectionScreen({ route, navigation }: any) {
//   const { beat } = route.params;

//   const [answers, setAnswers] = useState<any>({});
//   const [photos, setPhotos] = useState<string[]>([]);
//   const [submitting, setSubmitting] = useState(false);
//   const [insideBeat, setInsideBeat] = useState<boolean | null>(null);

//   useEffect(() => {
//     // checkLocation();
//     setInsideBeat(true);

//   }, []);

//   const checkLocation = async () => {
//     const loc = await Location.getCurrentPositionAsync({});
//     const d =
//       Math.abs(loc.coords.latitude - beat.latitude) +
//       Math.abs(loc.coords.longitude - beat.longitude);

//     setInsideBeat(d < 0.001); // rough visual check (real validation backend)
//   };

//   const addPhoto = async () => {
//     const r = await ImagePicker.launchCameraAsync({
//       quality: 0.5
//     });

//     if (!r.canceled) {
//       setPhotos([...photos, r.assets[0].uri]);
//     }
//   };

//   // const submit = async () => {
//   //   // if (!insideBeat) {
//   //   //   Alert.alert("Outside Beat", "You must be inside beat location to submit.");
//   //   //   return;
//   //   // }

//   //   if (photos.length === 0) {
//   //     Alert.alert("Evidence Required", "Please add at least one photo.");
//   //     return;
//   //   }

//   //   setSubmitting(true);

//   //   try {
//   //     const loc = await Location.getCurrentPositionAsync({});

//   //     const payload = SWEEPING_QUESTIONS.map(q => ({
//   //       questionCode: q.code,
//   //       answer:
//   //         q.type === "boolean"
//   //           ? answers[q.code] === true
//   //           : true,
//   //       photos
//   //     }));

//   //     await submitSweepingInspection({
//   //       sweepingBeatId: beat.id,
//   //       latitude: loc.coords.latitude,
//   //       longitude: loc.coords.longitude,
//   //       answers: payload
//   //     });

//   //     Alert.alert("Success", "Inspection submitted successfully");
//   //     navigation.goBack();
//   //   } catch {
//   //     Alert.alert("Error", "Submission failed");
//   //   } finally {
//   //     setSubmitting(false);
//   //   }
//   // };

//   const submit = async () => {
//     if (photos.length === 0) {
//       Alert.alert("Evidence Required", "Please add at least one photo.");
//       return;
//     }

//     setSubmitting(true);

//     try {
//       console.log("🟢 Submit pressed");

//       const loc = await Location.getCurrentPositionAsync({});
//       console.log("📍 Location:", loc.coords);

//       const payload = SWEEPING_QUESTIONS.map(q => ({
//         questionCode: q.code,
//         answer: q.type === "boolean" ? answers[q.code] === true : true,
//         photos
//       }));

//       console.log("📦 Payload:", payload);

//       const res = await submitSweepingInspection({
//         sweepingBeatId: beat.id,
//         latitude: loc.coords.latitude,
//         longitude: loc.coords.longitude,
//         answers: payload
//       });

//       console.log("✅ Backend response:", res);

//       Alert.alert("SUBMITTED ✅", "Inspection submitted successfully");

//       navigation.goBack();

//     } catch (err) {
//       console.log("❌ Submit error:", err);
//       Alert.alert("FAILED ❌", "Check console logs");
//     } finally {
//       setSubmitting(false);
//     }
//   };


//   return (
//     <View style={{ flex: 1, backgroundColor: "#f5f7fb" }}>

//       {/* GPS STATUS */}
//       <View
//         style={{
//           padding: 12,
//           backgroundColor: insideBeat ? "#dcfce7" : "#fee2e2"
//         }}
//       >
//         <Text style={{ textAlign: "center", fontWeight: "600" }}>
//           {insideBeat ? "🟢 Inside Beat Area" : "🔴 Outside Beat Area"}
//         </Text>
//       </View>

//       <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 160 }}>

//         {/* QUESTIONS */}
//         {SWEEPING_QUESTIONS.map((q, i) => (
//           <View
//             key={q.code}
//             style={{
//               backgroundColor: "#fff",
//               padding: 14,
//               borderRadius: 12,
//               marginBottom: 12
//             }}
//           >
//             <Text style={{ fontWeight: "600" }}>
//               {i + 1}. {q.label}
//             </Text>

//             <Text style={{ color: "#6b7280", marginBottom: 8 }}>
//               {q.hi}
//             </Text>

//             {q.type === "boolean" && (
//               <View style={{ flexDirection: "row" }}>
//                 {["Yes", "No"].map(v => (
//                   <TouchableOpacity
//                     key={v}
//                     onPress={() =>
//                       setAnswers({ ...answers, [q.code]: v === "Yes" })
//                     }
//                     style={{
//                       flex: 1,
//                       padding: 12,
//                       borderRadius: 8,
//                       marginRight: v === "Yes" ? 8 : 0,
//                       backgroundColor:
//                         answers[q.code] === (v === "Yes")
//                           ? "#dcfce7"
//                           : "#f1f5f9"
//                     }}
//                   >
//                     <Text style={{ textAlign: "center" }}>{v}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             {q.type === "choice" && (
//               <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
//                 {q.options?.map(opt => (
//                   <TouchableOpacity
//                     key={opt}
//                     onPress={() => setAnswers({ ...answers, [q.code]: opt })}
//                     style={{
//                       padding: 10,
//                       borderRadius: 8,
//                       backgroundColor:
//                         answers[q.code] === opt ? "#dbeafe" : "#f1f5f9",
//                       marginRight: 8,
//                       marginBottom: 8
//                     }}
//                   >
//                     <Text>{opt}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}

//             {q.type === "text" && (
//               <TextInput
//                 placeholder="Type here..."
//                 value={answers[q.code] || ""}
//                 onChangeText={t => setAnswers({ ...answers, [q.code]: t })}
//                 style={{
//                   borderWidth: 1,
//                   borderColor: "#e5e7eb",
//                   borderRadius: 8,
//                   padding: 10
//                 }}
//               />
//             )}
//           </View>
//         ))}

//         {/* PHOTO SECTION */}
//         <View style={{ backgroundColor: "#fff", padding: 14, borderRadius: 12 }}>
//           <Text style={{ fontWeight: "600", marginBottom: 8 }}>
//             Photo Evidence
//           </Text>

//           <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
//             {photos.map(p => (
//               <Image
//                 key={p}
//                 source={{ uri: p }}
//                 style={{
//                   width: 80,
//                   height: 80,
//                   borderRadius: 8,
//                   marginRight: 8,
//                   marginBottom: 8
//                 }}
//               />
//             ))}

//             <TouchableOpacity
//               onPress={addPhoto}
//               style={{
//                 width: 80,
//                 height: 80,
//                 borderRadius: 8,
//                 borderWidth: 1,
//                 borderColor: "#94a3b8",
//                 justifyContent: "center",
//                 alignItems: "center"
//               }}
//             >
//               <Text style={{ fontSize: 30 }}>+</Text>
//             </TouchableOpacity>
//           </View>
//         </View>

//       </ScrollView>

//       {/* SUBMIT */}
//       <View style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}>
//         <TouchableOpacity
//           disabled={submitting}
//           onPress={submit}
//           style={{
//             backgroundColor: "#2563eb",
//             padding: 16,
//             borderRadius: 14,
//             alignItems: "center"
//           }}
//         >
//           {submitting ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
//               Submit Inspection
//             </Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SWEEPING_QUESTIONS } from "../questions";
import { submitSweepingInspection } from "../../../api/auth";

export default function SweepingInspectionScreen({ route, navigation }: any) {
  const { beat } = route.params;

  const [answers, setAnswers] = useState<any>({});
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ================= PHOTO PER QUESTION ================= */

  const addPhoto = async (code: string) => {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.5 });

    if (!r.canceled) {
      setPhotos(prev => ({
        ...prev,
        [code]: [...(prev[code] || []), r.assets[0].uri]
      }));
    }
  };

  /* ================= VALIDATION (ANSWERS ONLY) ================= */

  const validate = () => {
    for (const q of SWEEPING_QUESTIONS) {
      if (answers[q.code] === undefined || answers[q.code] === "") {
        Alert.alert("Missing Answer", `Please answer: ${q.label}`);
        return false;
      }
    }
    return true;
  };

  /* ================= SUBMIT ================= */

  const submit = async () => {
    if (!validate()) return;

    setSubmitting(true);

    try {
      console.log("🟢 Submit pressed");

      const payload = SWEEPING_QUESTIONS.map(q => ({
        questionCode: q.code,
        answer: q.type === "boolean" ? answers[q.code] === true : true,
        photos: photos[q.code] || []
      }));

      console.log("📦 Payload:", payload);

      await submitSweepingInspection({
        sweepingBeatId: beat.id,
        latitude: beat.latitude,
        longitude: beat.longitude,
        answers: payload
      });

      Alert.alert("✅ SUBMITTED", "Inspection submitted successfully");
      navigation.goBack();

    } catch (e) {
      console.log("❌ Submit error:", e);
      Alert.alert("FAILED ❌", "Check console logs");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fb" }}>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 160 }}>

        {SWEEPING_QUESTIONS.map((q, i) => (
          <View key={q.code} style={{ backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 12 }}>

            <Text style={{ fontWeight: "700" }}>
              {i + 1}. {q.label} *
            </Text>

            <Text style={{ color: "#6b7280", marginBottom: 8 }}>{q.hi}</Text>

            {/* BOOLEAN */}
            {q.type === "boolean" && (
              <View style={{ flexDirection: "row" }}>
                {["Yes", "No"].map(v => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setAnswers({ ...answers, [q.code]: v === "Yes" })}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      marginRight: v === "Yes" ? 8 : 0,
                      backgroundColor:
                        answers[q.code] === (v === "Yes") ? "#dcfce7" : "#f1f5f9"
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

            {/* TEXT */}
            {q.type === "text" && (
              <TextInput
                value={answers[q.code] || ""}
                onChangeText={t => setAnswers({ ...answers, [q.code]: t })}
                style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10 }}
              />
            )}

            {/* OPTIONAL PHOTOS */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Photo Evidence (optional)</Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(photos[q.code] || []).map(p => (
                  <Image
                    key={p}
                    source={{ uri: p }}
                    style={{ width: 70, height: 70, borderRadius: 8, marginRight: 6, marginBottom: 6 }}
                  />
                ))}

                <TouchableOpacity
                  onPress={() => addPhoto(q.code)}
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#94a3b8",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: 26 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        ))}

      </ScrollView>

      <View style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}>
        <TouchableOpacity
          disabled={submitting}
          onPress={submit}
          style={{
            backgroundColor: "#2563eb",
            padding: 16,
            borderRadius: 14,
            alignItems: "center"
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Submit Inspection
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}
