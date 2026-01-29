import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { ToiletApi } from "../../api/modules";
import { useAuthContext } from "../../auth/AuthProvider";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletHomeScreen({ navigation }: { navigation: Nav }) {
    const { auth } = useAuthContext();
    const [inspections, setInspections] = useState<any[]>([]);
    const [stats, setStats] = useState({ pending: 0, done: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const isQc = auth.status === "authenticated" && auth.roles?.includes("QC");

    const loadData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        setError("");
        try {
            // Fetch real-time operational counts for Mobile Tiles (12.6)
            const statsRes = await ToiletApi.getDashboardStats();
            setStats({
                pending: statsRes.pendingReview,
                done: statsRes.inspectionsDone,
                rejected: 0 // Will be derived if needed
            });

            // Fetch actual Pending List (12.7)
            const iRes = await ToiletApi.listInspections({ status: "SUBMITTED" });
            setInspections(iRes.inspections);
        } catch (err) {
            setError("Failed to load audit queue.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const renderInspectionItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ToiletReview", { inspection: item })}
        >
            <View style={styles.toiletInfo}>
                <Text style={styles.toiletName}>{item.toilet.name}</Text>
                <Text style={styles.toiletType}>Inspector: {item.employee.name}</Text>
                <Text style={styles.timeText}>🕒 Submitted {new Date(item.createdAt).toLocaleTimeString()}</Text>
            </View>
            <View style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>REVIEW</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header (12.6) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>QC Quality Audit</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : (
                <FlatList
                    ListHeaderComponent={
                        <>
                            {/* Summary Tiles (12.6) */}
                            <View style={styles.statsRow}>
                                <View style={[styles.statTile, { backgroundColor: '#fff7ed' }]}>
                                    <Text style={[styles.statNum, { color: '#c2410c' }]}>{stats.pending}</Text>
                                    <Text style={styles.statLabel}>PENDING</Text>
                                </View>
                                <View style={[styles.statTile, { backgroundColor: '#f0fdf4' }]}>
                                    <Text style={[styles.statNum, { color: '#15803d' }]}>{stats.done}</Text>
                                    <Text style={styles.statLabel}>APPROVED</Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.statTile, { backgroundColor: '#eff6ff' }]}
                                    onPress={() => navigation.navigate("ToiletPendingRegistration")}
                                >
                                    <Text style={[styles.statNum, { color: '#1d4ed8' }]}>➤</Text>
                                    <Text style={styles.statLabel}>REQUESTS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.statTile, { backgroundColor: '#f8fafc' }]}
                                    onPress={() => navigation.navigate("ToiletMaster")}
                                >
                                    <Text style={[styles.statNum, { color: '#1e293b' }]}>📋</Text>
                                    <Text style={styles.statLabel}>MASTER</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.sectionTitle}>AUDIT QUEUE ({inspections.length})</Text>
                        </>
                    }
                    data={inspections}
                    renderItem={renderInspectionItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} tintColor="#1d4ed8" />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>All Caught Up!</Text>
                            <Text style={styles.emptySub}>No pending toilet inspections for your assigned wards.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f1f5f9" },
    header: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    backBtn: { width: 40 },
    backText: { fontSize: 24, fontWeight: "700", color: "#1e293b" },
    headerTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', gap: 12, padding: 16 },
    statTile: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    statNum: { fontSize: 24, fontWeight: '900' },
    statLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', marginTop: 4 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginHorizontal: 16, marginTop: 10, marginBottom: 15, letterSpacing: 1.5 },
    list: { paddingBottom: 40 },
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, marginHorizontal: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    toiletInfo: { flex: 1 },
    toiletName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
    toiletType: { fontSize: 13, color: "#64748b", marginTop: 4, fontWeight: '600' },
    timeText: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
    actionBtn: { backgroundColor: "#1d4ed8", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 11 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8, paddingHorizontal: 40, textAlign: 'center' }
});
