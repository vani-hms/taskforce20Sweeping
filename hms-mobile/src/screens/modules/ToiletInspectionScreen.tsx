import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, SafeAreaView } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { ToiletApi } from "../../api/modules";

type Props = NativeStackScreenProps<RootStackParamList, "ToiletInspection">;

// Helper: Distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALLOWED_RADIUS_KM = 0.1; // 100 meters

export default function ToiletInspectionScreen({ route, navigation }: Props) {
    const { toilet } = route.params;
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isOutside, setIsOutside] = useState(false);

    // Track if component is mounted to prevent state updates after unmount
    const isMountedRef = React.useRef(true);

    // State: { [questionId]: { value: "YES", photos: [] } }
    const [answers, setAnswers] = useState<Record<string, { value: "YES" | "NO", photos: string[] }>>({});

    useEffect(() => {
        isMountedRef.current = true;

        (async () => {
            try {
                // 1. Precise Location Check (Anti-Fraud)
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert("Permission Error", "GPS is mandatory for inspections.");
                    navigation.goBack();
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                if (!isMountedRef.current) return;
                setLocation(loc);

                // 2. Radius Check
                if (toilet.latitude && toilet.longitude) {
                    const dist = getDistance(loc.coords.latitude, loc.coords.longitude, toilet.latitude, toilet.longitude);
                    if (dist > ALLOWED_RADIUS_KM) {
                        setIsOutside(true);
                        Alert.alert("Outside Area", `You are far from the toilet (${(dist * 1000).toFixed(0)} meters). Please go to the site to start inspection.`);
                        return;
                    }
                }

                // 3. Load Dynamic Checklist
                const res = await ToiletApi.listQuestions();
                if (!isMountedRef.current) return;
                setQuestions(res.questions);

                const initialAnswers: any = {};
                res.questions.forEach((q: any) => {
                    initialAnswers[q.id] = { value: "YES", photos: [] };
                });
                setAnswers(initialAnswers);
            } catch (err) {
                Alert.alert("Error", "Checklist initialization failed.");
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const takePhoto = async (qId: string) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Camera Permission", "Camera access is required to take photos.");
                return;
            }

            // Critical delay to ensure app state is stable before camera opens
            await new Promise(resolve => setTimeout(resolve, 500));

            const result = await ImagePicker.launchCameraAsync({
                quality: 0.12, // Decent quality, memory-efficient for multiple photos
                base64: true,
                allowsEditing: false,
                exif: false
            });

            // Check if component is still mounted after camera closes
            if (!isMountedRef.current) return;

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                if (asset.base64) {
                    const base64Photo = `data:image/jpeg;base64,${asset.base64}`;

                    setAnswers(prevAnswers => {
                        const currentPhotos = prevAnswers[qId]?.photos || [];
                        if (currentPhotos.length >= 3) {
                            Alert.alert("Limit Reached", "Maximum 3 photos per question.");
                            return prevAnswers;
                        }

                        return {
                            ...prevAnswers,
                            [qId]: {
                                ...prevAnswers[qId],
                                photos: [...currentPhotos, base64Photo]
                            }
                        };
                    });
                }
            }
        } catch (error) {
            console.error("Camera error:", error);
            if (isMountedRef.current) {
                Alert.alert("Camera Error", "Failed to capture photo. Please try again.");
            }
        }
    };

    const removePhoto = (qId: string, photoIndex: number) => {
        setAnswers(prevAnswers => {
            const currentPhotos = [...(prevAnswers[qId]?.photos || [])];
            currentPhotos.splice(photoIndex, 1);
            return {
                ...prevAnswers,
                [qId]: {
                    ...prevAnswers[qId],
                    photos: currentPhotos
                }
            };
        });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await ToiletApi.submitInspection({
                toiletId: toilet.id,
                latitude: location?.coords.latitude || 0,
                longitude: location?.coords.longitude || 0,
                answers: questions.map(q => ({
                    questionId: q.id,
                    value: answers[q.id].value,
                    photos: answers[q.id].photos
                }))
            });
            Alert.alert("Success", "Report submitted. Waiting for QC review.", [
                { text: "OK", onPress: () => navigation.popToTop() }
            ]);
        } catch (err: any) {
            Alert.alert("Submission Failed", err.message || "Network error.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.loadBox}><ActivityIndicator size="large" color="#1d4ed8" /><Text style={{ marginTop: 15, fontWeight: '800', color: '#64748b' }}>Verifying Location...</Text></View>;

    if (isOutside) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.errBox}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={styles.errTitle}>Outside Inspection Zone</Text>
                <Text style={styles.errSub}>You must be within 500m of the toilet to start work.</Text>
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <Text style={styles.backLinkText}>GO BACK</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.title} numberOfLines={1}>{toilet.name}</Text>
                    <Text style={styles.subtitle}>INSPECTION MODE</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.sectionHeader}>CHECKLIST & EVIDENCE</Text>
                {questions.map((q, idx) => (
                    <View key={q.id} style={styles.qCard}>
                        <View style={styles.qTop}>
                            <Text style={styles.qText}>{idx + 1}. {q.text}</Text>
                            <View style={styles.toggleRow}>
                                <TouchableOpacity
                                    style={[styles.miniBtn, answers[q.id].value === "YES" && styles.btnYes]}
                                    onPress={() => setAnswers({ ...answers, [q.id]: { ...answers[q.id], value: "YES" } })}
                                >
                                    <Text style={[styles.btnText, answers[q.id].value === "YES" && { color: '#fff' }]}>YES</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.miniBtn, answers[q.id].value === "NO" && styles.btnNo]}
                                    onPress={() => setAnswers({ ...answers, [q.id]: { ...answers[q.id], value: "NO" } })}
                                >
                                    <Text style={[styles.btnText, answers[q.id].value === "NO" && { color: '#fff' }]}>NO</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.photoRow}>
                            {answers[q.id].photos.map((uri, i) => (
                                <View key={i} style={styles.picWrap}>
                                    <Image source={{ uri }} style={styles.pic} />
                                    <TouchableOpacity style={styles.picRemove} onPress={() => removePhoto(q.id, i)}>
                                        <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {answers[q.id].photos.length < 3 && (
                                <TouchableOpacity style={styles.picAdd} onPress={() => takePhoto(q.id)}>
                                    <Text style={{ fontSize: 20, color: '#94a3b8' }}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {answers[q.id].photos.length === 0 && <Text style={styles.warnText}>* Photo Proof Required</Text>}
                    </View>
                ))}
                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>SUBMIT TO QC</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    loadBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 20 },
    errSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 20 },
    backLink: { marginTop: 30, padding: 15, borderRadius: 8, backgroundColor: '#f1f5f9' },
    backLinkText: { fontWeight: '900', color: '#1d4ed8', fontSize: 13 },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 10, color: '#1d4ed8', fontWeight: '900', letterSpacing: 1 },
    scroll: { padding: 16 },
    sectionHeader: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 24, letterSpacing: 1.5 },
    qCard: { marginBottom: 32, borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 20 },
    qTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    qText: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 20 },
    toggleRow: { flexDirection: 'row', gap: 6 },
    miniBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
    btnYes: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    btnNo: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
    btnText: { fontSize: 10, fontWeight: '900', color: '#64748b' },
    photoRow: { flexDirection: 'row', gap: 10 },
    picWrap: { width: 65, height: 65, borderRadius: 8, overflow: 'hidden' },
    pic: { width: '100%', height: '100%' },
    picRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    picAdd: { width: 65, height: 65, borderRadius: 8, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfdfe' },
    warnText: { fontSize: 9, color: '#dc2626', fontWeight: '900', marginTop: 10 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
    submitBtn: { backgroundColor: '#1d4ed8', padding: 18, borderRadius: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 15 }
});
