import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, SafeAreaView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { ToiletApi } from "../../api/modules";

type Props = NativeStackScreenProps<RootStackParamList, "ToiletReview">;

// Helper: Haversine distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ToiletReviewScreen({ route, navigation }: Props) {
    const { inspection } = route.params;
    const [submitting, setSubmitting] = useState(false);

    // Calculate distance between reported location and toilet master location
    const reportedDist = inspection.latitude && inspection.longitude && inspection.toilet.latitude && inspection.toilet.longitude
        ? getDistance(inspection.latitude, inspection.longitude, inspection.toilet.latitude, inspection.toilet.longitude) * 1000 // meters
        : null;

    const handleDecision = async (status: "APPROVED" | "REJECTED") => {
        if (status === "REJECTED") {
            Alert.prompt(
                "Mandatory Reason",
                "Explain why this inspection is being rejected",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Confirm Reject",
                        style: "destructive",
                        onPress: async (text: string | undefined) => {
                            if (!text || text.trim().length === 0) {
                                Alert.alert("Required", "Reason is mandatory for rejection.");
                                return;
                            }
                            submitDecision(status, text);
                        }
                    }
                ]
            );
        } else {
            Alert.alert(
                "Final Approval",
                "Approve this inspection? This will update the compliance reports.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm Approve", onPress: () => submitDecision(status) }
                ]
            );
        }
    };

    const submitDecision = async (status: "APPROVED" | "REJECTED", remarks?: string) => {
        setSubmitting(true);
        try {
            await ToiletApi.updateInspection(inspection.id, { status, remarks });
            Alert.alert("Success", `Report ${status.toLowerCase()}.`);
            navigation.goBack();
        } catch (err: any) {
            Alert.alert("Error", err.message || "Action failed.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.title}>{inspection.toilet.name}</Text>
                    <Text style={styles.subtitle}>QC QUALITY AUDIT</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <View style={styles.geoBox}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>INSPECTOR</Text>
                        <Text style={styles.val}>{inspection.employee.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>SUBMISSION</Text>
                        <Text style={styles.val}>{new Date(inspection.createdAt).toLocaleTimeString()}</Text>
                    </View>
                </View>

                {/* Accuracy Alert */}
                <View style={[styles.mismatchCard, (reportedDist && reportedDist > 100) ? { backgroundColor: '#fff7ed', borderColor: '#fdba74' } : {}]}>
                    <Text style={styles.mismatchText}>
                        {reportedDist !== null
                            ? `GPS Accuracy: ${reportedDist.toFixed(0)}m from target`
                            : "GPS Data Missing"
                        }
                    </Text>
                    {reportedDist && reportedDist > 100 && (
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#ea580c', marginTop: 4 }}>⚠️ HIGH MISMATCH - VERIFY SITE CAREFULLY</Text>
                    )}
                </View>

                <Text style={styles.sectionTitle}>FIELD RESULTS</Text>
                {inspection.answers.map((ans: any, idx: number) => (
                    <View key={ans.id} style={styles.ansCard}>
                        <View style={styles.ansRow}>
                            <Text style={styles.ansText}>{idx + 1}. {ans.question.text}</Text>
                            <Text style={[styles.badge, ans.value === "YES" ? styles.badgeYes : styles.badgeNo]}>
                                {ans.value.toUpperCase()}
                            </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                            {ans.photos.map((p: any) => (
                                <View key={p.id} style={styles.photoWrap}>
                                    <Image source={{ uri: p.url }} style={styles.photo} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ))}

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.footer}>
                {submitting ? (
                    <ActivityIndicator color="#1d4ed8" />
                ) : (
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnReject]}
                            onPress={() => handleDecision("REJECTED")}
                        >
                            <Text style={[styles.btnText, { color: '#991b1b' }]}>REJECT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnAction]}
                            onPress={() => handleDecision("ACTION_REQUIRED" as any)}
                        >
                            <Text style={[styles.btnText, { color: '#854d0e' }]}>ACTION REQUIRED</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnApprove]}
                            onPress={() => handleDecision("APPROVED")}
                        >
                            <Text style={[styles.btnText, { color: '#fff' }]}>APPROVE</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: { padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { fontSize: 24, color: '#1e293b', fontWeight: '700' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 10, color: '#1d4ed8', fontWeight: '900', letterSpacing: 1.5 },
    geoBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
    label: { fontSize: 9, color: '#94a3b8', fontWeight: '800', letterSpacing: 1 },
    val: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 2 },
    mismatchCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
    mismatchText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 16, letterSpacing: 2 },
    ansCard: { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 16 },
    ansRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    ansText: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 15 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 10, fontWeight: '900', overflow: 'hidden' },
    badgeYes: { backgroundColor: '#dcfce7', color: '#166534' },
    badgeNo: { backgroundColor: '#fee2e2', color: '#991b1b' },
    photoList: { marginTop: 4 },
    photoWrap: { width: 120, height: 160, borderRadius: 12, marginRight: 12, backgroundColor: '#f1f5f9', overflow: 'hidden' },
    photo: { width: '100%', height: '100%' },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff' },
    btnRow: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    btnReject: { backgroundColor: '#fef2f2', borderWidth: 2, borderColor: '#fee2e2' },
    btnAction: { backgroundColor: '#fefce8', borderWidth: 2, borderColor: '#fef08a' },
    btnApprove: { backgroundColor: '#1d4ed8' },
    btnText: { fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
});
