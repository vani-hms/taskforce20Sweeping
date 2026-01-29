import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { ToiletApi } from "../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletMyRequestsScreen({ navigation }: { navigation: Nav }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (isRef = false) => {
        if (!isRef) setLoading(true);
        try {
            // Need a backend endpoint for my requests
            const res = await ToiletApi.listMyRequests();
            // For now, let's assume this returns all pending, we might need a "my" filter on backend
            setRequests(res.toilets || []);
        } catch (e) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.statusBadge, item.status === 'APPROVED' ? styles.bgApp : item.status === 'REJECTED' ? styles.bgRej : styles.bgPen]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>📍 {item.ward?.name || 'Ward ID: ' + item.wardId}</Text>
                <Text style={styles.detailText}>🚽 {item.type} | {item.gender}</Text>
                <Text style={styles.dateText}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <Text style={styles.title}>My Toilet Requests</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("ToiletRegister")}>
                    <Text style={styles.addBtnText}>+ NEW</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No Requests Yet</Text>
                            <Text style={styles.emptySub}>Tap "NEW" to request a toilet registration in your assigned ward.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#f1f5f9" },
    header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    addBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '900', color: '#fff' },
    bgPen: { backgroundColor: '#f59e0b' },
    bgApp: { backgroundColor: '#10b981' },
    bgRej: { backgroundColor: '#ef4444' },
    details: { gap: 4 },
    detailText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    dateText: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8, paddingHorizontal: 40, textAlign: 'center' }
});
