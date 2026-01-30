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
                <Text style={styles.detailText}>📍 Location verified: {Math.round(item.distanceMeters)}m from asset</Text>
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
    safe: { flex: 1, backgroundColor: "#f8fafc" },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    addBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    tabBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 6, margin: 16, borderRadius: 12, marginBottom: 0 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#eff6ff' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    activeTabText: { color: '#1d4ed8' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    typeLabel: { fontSize: 9, fontWeight: '900', color: '#10b981', letterSpacing: 0.5, marginBottom: 2 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900', color: '#fff' },
    details: { gap: 6 },
    detailText: { fontSize: 13, color: '#475569', fontWeight: '600' },
    dateText: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '700', fontStyle: 'italic' },
    qcNote: { marginTop: 12, padding: 12, backgroundColor: '#fff7ed', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#f97316' },
    qcNoteTitle: { fontSize: 10, fontWeight: '900', color: '#9a3412', marginBottom: 4 },
    qcNoteText: { fontSize: 12, color: '#7c2d12', fontWeight: '500' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 8, paddingHorizontal: 60, textAlign: 'center', lineHeight: 18 }
});
