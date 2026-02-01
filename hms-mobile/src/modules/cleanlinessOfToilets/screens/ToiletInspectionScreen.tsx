import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, SafeAreaView, TextInput, Dimensions } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";
import { ToiletApi } from "../../../api/modules";

type Props = NativeStackScreenProps<RootStackParamList, "ToiletInspection">;

// Helper: Distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALLOWED_RADIUS_KM = 0.5;

export default function ToiletInspectionScreen({ route, navigation }: Props) {
    const { toilet } = route.params;
    const { width } = Dimensions.get('window');
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isOutside, setIsOutside] = useState(false);
    const [photoAddedMsg, setPhotoAddedMsg] = useState<string | null>(null);

    // Track if component is mounted
    const isMountedRef = React.useRef(true);

    // State: { [questionId]: { value: any, photos: [] } }
    const [answers, setAnswers] = useState<Record<string, { value: any, photos: string[] }>>({});

    useEffect(() => {
        isMountedRef.current = true;
        loadData();
        return () => { isMountedRef.current = false; };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Precise Location Check
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
                    return;
                }
            }

            // 3. Load Questions for this toilet type
            const res = await ToiletApi.listQuestions({ toiletId: toilet.id });
            if (!isMountedRef.current) return;
            setQuestions(res.questions);

            const initialAnswers: any = {};
            res.questions.forEach((q: any) => {
                let initialValue: any = "";
                if (q.type === 'YES_NO') initialValue = "YES";
                else if (q.type === 'OPTIONS' && q.options?.length > 0) initialValue = q.options[0];

                initialAnswers[q.id] = { value: initialValue, photos: [] };
            });
            setAnswers(initialAnswers);
        } catch (err) {
            Alert.alert("Error", "Initialization failed.");
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const pickPhoto = async (qId: string) => {
        Alert.alert(
            "Add Evidence",
            "Choose source",
            [
                { text: "Camera", onPress: () => launchCamera(qId) },
                { text: "Gallery", onPress: () => launchGallery(qId) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleImageResult = (qId: string, result: ImagePicker.ImagePickerResult) => {
        if (!result.canceled && result.assets && result.assets[0].base64) {
            const base64Photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setAnswers(prev => ({
                ...prev,
                [qId]: { ...prev[qId], photos: [...(prev[qId]?.photos || []), base64Photo] }
            }));
            setPhotoAddedMsg(qId);
            setTimeout(() => { if (isMountedRef.current) setPhotoAddedMsg(null); }, 2000);
        }
    };

    const launchCamera = async (qId: string) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Required", "Camera access needed.");
        const result = await ImagePicker.launchCameraAsync({ quality: 0.5, base64: true, allowsEditing: false });
        handleImageResult(qId, result);
    };

    const launchGallery = async (qId: string) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert("Required", "Gallery access needed.");
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: true, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });
        handleImageResult(qId, result);
    };

    const removePhoto = (qId: string, idx: number) => {
        setAnswers(prev => {
            const photos = [...prev[qId].photos];
            photos.splice(idx, 1);
            return { ...prev, [qId]: { ...prev[qId], photos } };
        });
    };

    const handleSubmit = async () => {
        // Validation Removed as requested
        setSubmitting(true);
        try {
            const payloadAnswers: Record<string, any> = {};
            questions.forEach(q => {
                payloadAnswers[q.text] = {
                    answer: answers[q.id].value,
                    photos: answers[q.id].photos
                };
            });

            await ToiletApi.submitInspection({
                toiletId: toilet.id,
                latitude: location?.coords.latitude || 0,
                longitude: location?.coords.longitude || 0,
                answers: payloadAnswers
            });

            Alert.alert("Success", "Inspection report submitted successfully.", [
                { text: "OK", onPress: () => navigation.popToTop() }
            ]);
        } catch (err: any) {
            Alert.alert("Failed", err.message || "Submission failed.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <View style={styles.loadBox}><ActivityIndicator size="large" color="#1d4ed8" /><Text style={styles.loadText}>Verifying Location...</Text></View>;

    if (isOutside) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.errBox}>
                <Text style={{ fontSize: 40 }}>📍</Text>
                <Text style={styles.errTitle}>Outside Zone</Text>
                <Text style={styles.errSub}>You must be near the asset to conduct inspection.</Text>
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}><Text style={styles.backLinkText}>GO BACK</Text></TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.title} numberOfLines={1}>{toilet.name}</Text>
                    <Text style={styles.subtitle}>{toilet.type} INSPECTION</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.sectionHeader}>TOILET INSPECTION QUESTIONS</Text>

                {questions.map((q, idx) => (
                    <View key={q.id} style={styles.qCard}>
                        <Text style={styles.qText}>{q.text}</Text>

                        {/* Input Type Handling */}
                        <View style={styles.inputArea}>
                            {q.type === 'YES_NO' ? (
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
                            ) : q.type === 'OPTIONS' ? (
                                <View style={styles.optionsWrap}>
                                    {q.options?.map((opt: string) => (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[styles.optBtn, answers[q.id].value === opt && styles.optBtnActive]}
                                            onPress={() => setAnswers({ ...answers, [q.id]: { ...answers[q.id], value: opt } })}
                                        >
                                            <Text style={[styles.optText, answers[q.id].value === opt && styles.optTextActive]}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter details here..."
                                    value={answers[q.id].value}
                                    onChangeText={(val) => setAnswers({ ...answers, [q.id]: { ...answers[q.id], value: val } })}
                                />
                            )}
                        </View>

                        {/* Photo Evidence Section */}
                        <View style={styles.photoSection}>
                            <View style={styles.photoRow}>
                                {answers[q.id].photos.map((uri, i) => (
                                    <View key={i} style={styles.picWrap}>
                                        <Image source={{ uri }} style={styles.pic} />
                                        <TouchableOpacity style={styles.picRemove} onPress={() => removePhoto(q.id, i)}>
                                            <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {answers[q.id].photos.length < 5 && (
                                    <TouchableOpacity style={styles.picAdd} onPress={() => pickPhoto(q.id)}>
                                        <Text style={{ fontSize: 24, color: '#1d4ed8' }}>📸</Text>
                                        <Text style={styles.addPicText}>ADD PHOTO</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {photoAddedMsg === q.id && (
                                <Text style={styles.successText}>✓ Photo added successfully</Text>
                            )}
                        </View>
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
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>SUBMIT COMPLETED REPORT</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    loadBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadText: { marginTop: 15, fontWeight: '900', color: '#64748b' },
    errBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 20 },
    errSub: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    backLink: { marginTop: 30, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, backgroundColor: '#fff', elevation: 2 },
    backLinkText: { fontWeight: '900', color: '#1d4ed8', fontSize: 13 },
    header: { padding: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
    backBtn: { fontSize: 26, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 10, color: '#1d4ed8', fontWeight: '900', letterSpacing: 1, marginTop: 2 },
    scroll: { padding: 16 },
    sectionHeader: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 24, letterSpacing: 1.5, textAlign: 'center' },
    qCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    qText: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 15, lineHeight: 22 },
    inputArea: { marginBottom: 15 },
    toggleRow: { flexDirection: 'row', gap: 10 },
    miniBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
    btnYes: { backgroundColor: '#10b981', borderColor: '#10b981' },
    btnNo: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
    btnText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
    optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optBtn: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fdfdfe' },
    optBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    optText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    optTextActive: { color: '#fff' },
    textInput: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15, color: '#1e293b' },
    photoSection: { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    picWrap: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee' },
    pic: { width: '100%', height: '100%' },
    picRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    picAdd: { width: 70, height: 70, borderRadius: 12, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
    addPicText: { fontSize: 8, fontWeight: '900', color: '#1d4ed8', marginTop: 4 },
    warnText: { fontSize: 10, color: '#ef4444', fontWeight: '900', marginTop: 10 },
    successText: { fontSize: 11, color: '#10b981', fontWeight: '900', marginTop: 8 },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    submitBtn: { backgroundColor: '#1d4ed8', padding: 20, borderRadius: 18, alignItems: 'center', elevation: 4 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
