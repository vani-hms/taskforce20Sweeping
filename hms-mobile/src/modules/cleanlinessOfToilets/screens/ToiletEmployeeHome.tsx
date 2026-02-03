import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Image, Platform } from "react-native";
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
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'CT' | 'PT'>('ALL');
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
                    <View style={[styles.badge, isCT ? styles.badgeCT : styles.badgePT]}>
                        <Text style={[styles.badgeText, isCT ? styles.textCT : styles.textPT]}>
                            {isCT ? 'CT • Community' : 'PT • Public'}
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Assigned Assets</Text>
                <View style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'ALL' && styles.filterActive]}
                        onPress={() => setActiveFilter('ALL')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'CT' && styles.filterActive]}
                        onPress={() => setActiveFilter('CT')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'CT' && styles.filterTextActive]}>CT Only</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'PT' && styles.filterActive]}
                        onPress={() => setActiveFilter('PT')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'PT' && styles.filterTextActive]}>PT Only</Text>
                    </TouchableOpacity>
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
                            <Text style={styles.emptyText}>{error || "No toilets assigned to you yet."}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // Consistent Header Style
    header: {
        height: Platform.OS === 'android' ? 120 : 90, // Taller to accommodate Filters
        paddingTop: Platform.OS === 'android' ? 50 : 10,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        justifyContent: 'center'
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    filterRow: { flexDirection: 'row' },
    filterChip: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0'
    },
    filterActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    filterText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    filterTextActive: { color: '#fff' },

    listContent: { padding: 16, paddingBottom: 100 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    cardDone: {
        opacity: 0.8,
        backgroundColor: '#f8fafc'
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
    badgeCT: { backgroundColor: '#fff7ed' }, // Orange-ish light
    badgePT: { backgroundColor: '#eff6ff' }, // Blue-ish light
    textCT: { color: '#c2410c', fontSize: 11, fontWeight: '800' },
    textPT: { color: '#1d4ed8', fontSize: 11, fontWeight: '800' },
    badgeText: { fontSize: 11, fontWeight: '800' },

    distBadge: { flexDirection: 'row', alignItems: 'center' },
    distText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },

    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    cardAddress: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },

    cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    infoCol: { flex: 1 },
    infoLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
    infoValue: { fontSize: 13, fontWeight: '600', color: '#334155' },

    actionCol: {},
    statusPending: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    statusTextPending: { color: '#fff', fontSize: 11, fontWeight: '700' },
    statusDone: { flexDirection: 'row', alignItems: 'center' },
    statusTextDone: { color: '#059669', fontSize: 12, fontWeight: '800' },

    emptyContainer: { alignItems: 'center', marginTop: 60, padding: 20 },
    emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '500', textAlign: 'center' }
});
