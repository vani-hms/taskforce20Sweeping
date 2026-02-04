import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Image, Platform, ScrollView } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { RootStackParamList } from "../../../navigation/types";
import { ToiletApi } from "../../../api/modules";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Helper: Haversine distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }

export default function ToiletEmployeeHome({ navigation }: { navigation: Nav }) {
    const [toilets, setToilets] = useState<any[]>([]);
    const [filteredToilets, setFilteredToilets] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'TODAY' | 'PAST'>('TODAY');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'CT' | 'PT' | 'URINALS'>('ALL');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [myLoc, setMyLoc] = useState<Location.LocationObject | null>(null);

    const load = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        setError("");
        try {
            // Get current location
            let loc = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setMyLoc(loc);
                }
            } catch (e) { }

            const res = await ToiletApi.getMyToilets();
            const rawToilets = res.toilets || [];

            // Enrich with distance
            let enriched = rawToilets.map((t: any) => {
                let dist = 999999;
                if (loc && t.latitude && t.longitude) {
                    dist = getDistance(loc.coords.latitude, loc.coords.longitude, t.latitude, t.longitude);
                }
                return { ...t, distance: dist };
            });

            // Sort: Uninspected first, then nearest
            enriched.sort((a: any, b: any) => {
                const aDone = a.lastInspectionStatus === 'SUBMITTED' || a.lastInspectionStatus === 'APPROVED' ? 1 : 0;
                const bDone = b.lastInspectionStatus === 'SUBMITTED' || b.lastInspectionStatus === 'APPROVED' ? 1 : 0;
                if (aDone !== bDone) return aDone - bDone;
                return a.distance - b.distance;
            });

            setToilets(enriched);
            setFilteredToilets(enriched);
        } catch (err: any) {
            setError("Unable to load assigned list.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeFilter === 'ALL') {
            setFilteredToilets(toilets);
        } else {
            setFilteredToilets(toilets.filter(t => t.type === activeFilter));
        }
    }, [activeFilter, toilets]);

    useEffect(() => {
        load();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const isDone = item.lastInspectionStatus === 'SUBMITTED' || item.lastInspectionStatus === 'APPROVED';
        const isCT = item.type === 'CT';

        return (
            <TouchableOpacity
                style={[styles.card, isDone && styles.cardDone]}
                onPress={() => navigation.navigate("ToiletInspection", { toilet: item })}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.badge, item.type === 'CT' ? styles.badgeCT : item.type === 'PT' ? styles.badgePT : styles.badgeUrinal]}>
                        <Text style={[styles.badgeText, item.type === 'CT' ? styles.textCT : item.type === 'PT' ? styles.textPT : styles.textUrinal]}>
                            {item.type === 'CT' ? 'CT • Community' : item.type === 'PT' ? 'PT • Public' : 'UR • Urinal'}
                        </Text>
                    </View>
                    <View style={styles.distBadge}>
                        <Text style={styles.distText}>
                            {item.distance < 1000 ? `${item.distance.toFixed(1)} km` : '•'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardAddress} numberOfLines={2}>{item.address || "No address provided"}</Text>

                <View style={styles.cardFooter}>
                    <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>WARD</Text>
                        <Text style={styles.infoValue}>{item.wardId ? "Assigned" : "N/A"}</Text>
                    </View>
                    <View style={styles.actionCol}>
                        {isDone ? (
                            <View style={styles.statusDone}>
                                <Text style={styles.statusTextDone}>✓ COMPLETED</Text>
                            </View>
                        ) : (
                            <View style={styles.statusPending}>
                                <Text style={styles.statusTextPending}>START INSPECTION →</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.content}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeSub}>OPERATIONAL TOILETS</Text>
                    <Text style={styles.welcomeTitle}>Assigned Tasks</Text>
                </View>

                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterActive]}
                            onPress={() => setActiveFilter('ALL')}
                        >
                            <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>All Toilets</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'CT' && styles.filterActive]}
                            onPress={() => setActiveFilter('CT')}
                        >
                            <Text style={[styles.filterText, activeFilter === 'CT' && styles.filterTextActive]}>Community (CT)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'PT' && styles.filterActive]}
                            onPress={() => setActiveFilter('PT')}
                        >
                            <Text style={[styles.filterText, activeFilter === 'PT' && styles.filterTextActive]}>Public (PT)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === 'URINALS' && styles.filterActive]}
                            onPress={() => {
                                // @ts-ignore
                                setActiveFilter('URINALS')
                            }}
                        >
                            <Text style={[styles.filterText, activeFilter === 'URINALS' && styles.filterTextActive]}>Urinals</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : (
                <FlatList
                    data={filteredToilets}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ fontSize: 40, marginBottom: 16 }}>🎯</Text>
                            <Text style={styles.emptyText}>{error || "No tasks assigned for this category."}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fcfdfe' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 10 },
    welcomeSection: { marginBottom: 16, marginTop: 10 },
    welcomeSub: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 4 },
    welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    filterRow: { flexDirection: 'row', marginBottom: 10 },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 14,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 1,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
    },
    filterActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterTextActive: { color: '#fff' },

    listContent: { padding: 20, paddingBottom: 100 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    cardDone: {
        opacity: 0.8,
        backgroundColor: '#f8fafc',
        shadowOpacity: 0.05
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
    badgeCT: { backgroundColor: '#fff7ed' },
    badgePT: { backgroundColor: '#eff6ff' },
    badgeUrinal: { backgroundColor: '#f0fdf4' },
    textCT: { color: '#c2410c', fontSize: 10, fontWeight: '900' },
    textPT: { color: '#1d4ed8', fontSize: 10, fontWeight: '900' },
    textUrinal: { color: '#15803d', fontSize: 10, fontWeight: '900' },
    badgeText: { fontSize: 10, fontWeight: '900' },

    distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    distText: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },

    cardTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6 },
    cardAddress: { fontSize: 13, color: '#64748b', marginBottom: 20, lineHeight: 18, fontWeight: '500' },

    cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 16 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
    infoValue: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 2 },

    actionCol: {},
    statusPending: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, elevation: 4, shadowColor: '#1d4ed8', shadowOpacity: 0.3, shadowRadius: 8 },
    statusTextPending: { color: '#fff', fontSize: 11, fontWeight: '900' },
    statusDone: { flexDirection: 'row', alignItems: 'center' },
    statusTextDone: { color: '#10b981', fontSize: 12, fontWeight: '900' },

    emptyContainer: { alignItems: 'center', marginTop: 80, padding: 20 },
    emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '700', textAlign: 'center' }
});
