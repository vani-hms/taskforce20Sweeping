import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { ToiletApi } from "../../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletMyRequestsScreen({ navigation }: { navigation: Nav }) {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [inspections, setInspections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'REG' | 'INS'>('REG');

    const load = async (isRef = false) => {
        if (!isRef) setLoading(true);
        try {
            // Fetch registrations
            const regRes = await ToiletApi.listMyRequests();
            setRegistrations(regRes.toilets || []);

            // Fetch my inspections
            const insRes = await ToiletApi.getMyInspectionHistory();
            setInspections(insRes.inspections || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const data = tab === 'REG' ? registrations : inspections;

    const renderRegistration = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.typeLabel}>TOILET REGISTRATION</Text>
                    <Text style={styles.name}>{item.name}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>📍 {item.ward?.name || '---'}</Text>
                <Text style={styles.detailText}>🚽 {item.type} • {item.gender}</Text>
                <Text style={styles.dateText}>Requested: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    const renderInspection = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={[styles.typeLabel, { color: '#6366f1' }]}>CLEANLINESS INSPECTION</Text>
                    <Text style={styles.name}>{item.toilet?.name || 'Cleanliness Report'}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>📍 Location verified: {Math.round(item.distanceMeters)}m from toilet</Text>
                <Text style={styles.dateText}>Submitted: {new Date(item.createdAt).toLocaleString()}</Text>
                {item.qcComment && (
                    <View style={styles.qcNote}>
                        <Text style={styles.qcNoteTitle}>QC REMARK:</Text>
                        <Text style={styles.qcNoteText}>{item.qcComment}</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <Text style={styles.title}>Submissions</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("ToiletRegister")}>
                    <Text style={styles.addBtnText}>+ NEW</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'REG' && styles.activeTab]}
                    onPress={() => setTab('REG')}
                >
                    <Text style={[styles.tabText, tab === 'REG' && styles.activeTabText]}>Registrations</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'INS' && styles.activeTab]}
                    onPress={() => setTab('INS')}
                >
                    <Text style={[styles.tabText, tab === 'INS' && styles.activeTabText]}>Inspections</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={tab === 'REG' ? renderRegistration : renderInspection}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>Nothing here yet</Text>
                            <Text style={styles.emptySub}>Your submitted {tab === 'REG' ? 'toilet registrations' : 'cleanliness inspections'} will appear here.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function StatusBadge({ status }: { status: string }) {
    const bg = status === 'APPROVED' ? '#10b981' : status === 'REJECTED' ? '#ef4444' : status === 'ACTION_REQUIRED' ? '#f59e0b' : '#3b82f6';
    return (
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
            <Text style={styles.statusText}>{status}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fcfdfe" },
    header: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    addBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, elevation: 4, shadowColor: '#1d4ed8', shadowOpacity: 0.2, shadowRadius: 8 },
    addBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    tabBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, margin: 20, borderRadius: 16, marginBottom: 0 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    tabText: { fontSize: 13, fontWeight: '800', color: '#94a3b8' },
    activeTabText: { color: '#1d4ed8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    typeLabel: { fontSize: 9, fontWeight: '900', color: '#10b981', letterSpacing: 1, marginBottom: 4 },
    name: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    details: { gap: 8 },
    detailText: { fontSize: 14, color: '#475569', fontWeight: '700' },
    dateText: { fontSize: 11, color: '#94a3b8', marginTop: 8, fontWeight: '700' },
    qcNote: { marginTop: 16, padding: 16, backgroundColor: '#fff7ed', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#f97316' },
    qcNoteTitle: { fontSize: 10, fontWeight: '900', color: '#9a3412', marginBottom: 6, letterSpacing: 0.5 },
    qcNoteText: { fontSize: 13, color: '#7c2d12', fontWeight: '600', lineHeight: 18 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8, paddingHorizontal: 60, textAlign: 'center', lineHeight: 20, fontWeight: '500' }
});
