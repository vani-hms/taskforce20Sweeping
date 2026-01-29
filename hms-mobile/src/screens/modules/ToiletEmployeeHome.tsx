import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { RootStackParamList } from "../../navigation/types";
import { ToiletApi } from "../../api/modules";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Helper: Haversine distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
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
            // Get current location for distance sorting
            let loc = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setMyLoc(loc);
                }
            } catch (e) { console.log("Loc failed"); }

            const res = await ToiletApi.getMyToilets();

            // Enrich with distance and sort
            let enriched = (res.toilets as any[]).map((t: any) => {
                let dist = 999999;
                if (loc && t.latitude && t.longitude) {
                    dist = getDistance(loc.coords.latitude, loc.coords.longitude, t.latitude, t.longitude);
                }
                return { ...t, distance: dist };
            });

            // Sort logic: Uninspected first (NONE, REJECTED), then nearest
            enriched.sort((a: any, b: any) => {
                const aDone = a.lastInspectionStatus === 'SUBMITTED' || a.lastInspectionStatus === 'APPROVED' ? 1 : 0;
                const bDone = b.lastInspectionStatus === 'SUBMITTED' || b.lastInspectionStatus === 'APPROVED' ? 1 : 0;
                if (aDone !== bDone) return aDone - bDone;
                return a.distance - b.distance;
            });

            setToilets(enriched);
            setFilteredToilets(enriched); // Initially show all

            // Load history
            try {
                const histRes = await ToiletApi.getMyInspectionHistory();
                setHistory(histRes.inspections || []);
            } catch (e) { console.log("History failed", e); }
        } catch (err: any) {
            setError("Unable to load assigned toilets.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Apply filter when activeFilter or toilets change
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
        const isSubmitted = item.lastInspectionStatus === 'SUBMITTED' || item.lastInspectionStatus === 'APPROVED';
        const isRejected = item.lastInspectionStatus === 'REJECTED';
        const isInProgress = item.lastInspectionStatus === 'DRAFT';
        const isNotStarted = item.lastInspectionStatus === 'NONE';

        let statusLabel = "🔴 Not Started";
        let badgeStyle = styles.badgeNotStarted;
        let textStyle = styles.textNotStarted;

        if (isSubmitted) {
            statusLabel = "🟢 Submitted";
            badgeStyle = styles.badgeSubmitted;
            textStyle = styles.textSubmitted;
        } else if (isInProgress) {
            statusLabel = "🟡 In Progress";
            badgeStyle = styles.badgeInProgress;
            textStyle = styles.textInProgress;
        } else if (isRejected) {
            statusLabel = "❌ Rejected";
            badgeStyle = styles.badgeRejected;
            textStyle = styles.textRejected;
        }

        return (
            <TouchableOpacity
                style={[styles.card, isSubmitted && { opacity: 0.9, borderLeftColor: '#10b981' }]}
                onPress={() => navigation.navigate("ToiletInspection", { toilet: item })}
                disabled={isSubmitted}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={styles.toiletName}>{item.name}</Text>
                            <View style={[styles.typeBadge, item.type === 'CT' ? styles.typeBadgeCT : styles.typeBadgePT]}>
                                <Text style={styles.typeText}>{item.type === 'CT' ? 'CT' : 'PT'}</Text>
                            </View>
                        </View>
                        <Text style={styles.wardText}>📍 {item.ward}</Text>
                        {item.lastInspectionDate && (
                            <Text style={styles.lastInspectionText}>
                                Last: {new Date(item.lastInspectionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, badgeStyle]}>
                        <Text style={[styles.statusText, textStyle]}>{statusLabel.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.distanceText}>
                        {item.distance > 1000 ? 'Distance unknown' : `${item.distance.toFixed(2)} km away`}
                    </Text>
                    {!isSubmitted ? (
                        <Text style={styles.actionText}>TAP TO INSPECT →</Text>
                    ) : (
                        <Text style={[styles.actionText, { color: '#10b981' }]}>DONE • AWAITING QC</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <View style={styles.tabToggle}>
                    <TouchableOpacity
                        style={[styles.tabBtn, viewMode === 'TODAY' && styles.tabBtnActive]}
                        onPress={() => setViewMode('TODAY')}
                    >
                        <Text style={[styles.tabText, viewMode === 'TODAY' && styles.tabTextActive]}>Today's Route</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, viewMode === 'PAST' && styles.tabBtnActive]}
                        onPress={() => setViewMode('PAST')}
                    >
                        <Text style={[styles.tabText, viewMode === 'PAST' && styles.tabTextActive]}>History</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {viewMode === 'TODAY' && !loading && !error && (
                <View style={styles.routeContainer}>
                    <View style={styles.routeLine} />
                    <View style={styles.routePoints}>
                        {toilets.slice(0, 5).map((t, i) => (
                            <View key={t.id} style={styles.routePointContainer}>
                                <View style={[
                                    styles.routeDot,
                                    (t.lastInspectionStatus === 'SUBMITTED' || t.lastInspectionStatus === 'APPROVED') ? styles.routeDotDone : {}
                                ]}>
                                    <Text style={styles.routeIndex}>{i + 1}</Text>
                                </View>
                                <Text numberOfLines={1} style={styles.routeLabel}>{t.code || `T-${i + 1}`}</Text>
                            </View>
                        ))}
                        {toilets.length > 5 && (
                            <View style={styles.routePointContainer}>
                                <View style={[styles.routeDot, { backgroundColor: '#cbd5e1' }]}>
                                    <Text style={styles.routeIndex}>+{toilets.length - 5}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                    <Text style={styles.routeTitle}>Your Assigned Route ({toilets.length} Stops)</Text>
                </View>
            )}

            {/* Filter Buttons (Only for Today) */}
            {viewMode === 'TODAY' && !loading && !error && (
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterBtn, activeFilter === 'ALL' && styles.filterBtnActive]}
                        onPress={() => setActiveFilter('ALL')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>
                            All ({toilets.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, activeFilter === 'CT' && styles.filterBtnActive]}
                        onPress={() => setActiveFilter('CT')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'CT' && styles.filterTextActive]}>
                            CT ({toilets.filter(t => t.type === 'CT').length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, activeFilter === 'PT' && styles.filterBtnActive]}
                        onPress={() => setActiveFilter('PT')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'PT' && styles.filterTextActive]}>
                            PT ({toilets.filter(t => t.type === 'PT').length})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={viewMode === 'TODAY' ? filteredToilets : history}
                    renderItem={viewMode === 'TODAY' ? renderItem : ({ item }) => (
                        // Render History Item (Simplified)
                        <View style={[styles.card, { borderLeftColor: '#94a3b8' }]}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.toiletName}>{item.toilet?.name || 'Unknown Toilet'}</Text>
                                    <Text style={styles.wardText}>{new Date(item.createdAt).toLocaleDateString()} • {item.status}</Text>
                                </View>
                                <View style={[styles.statusBadge, item.status === 'APPROVED' ? styles.badgeSubmitted : styles.badgeInProgress]}>
                                    <Text style={styles.statusText}>{item.status}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No {viewMode === 'TODAY' ? 'Toilets' : 'History'} Found</Text>
                            <Text style={styles.emptySub}>
                                {viewMode === 'TODAY'
                                    ? 'You have no toilets assigned for today.'
                                    : 'No past inspections found.'
                                }
                            </Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#1d4ed8" />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f1f5f9" },
    header: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    filterContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 8 },
    filterBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    filterBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    filterText: { fontSize: 11, fontWeight: '800', color: '#64748b', textAlign: 'center' },
    filterTextActive: { color: '#fff' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: '#ef4444', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    toiletName: { fontSize: 17, fontWeight: '900', color: '#0f172a', marginRight: 8, flex: 1 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 6 },
    typeBadgeCT: { backgroundColor: '#dbeafe' },
    typeBadgePT: { backgroundColor: '#fef3c7' },
    typeText: { fontSize: 10, fontWeight: '900', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900' },
    badgeNotStarted: { backgroundColor: '#fee2e2' },
    textNotStarted: { color: '#dc2626' },
    badgeInProgress: { backgroundColor: '#fef9c3' },
    textInProgress: { color: '#854d0e' },
    badgeSubmitted: { backgroundColor: '#dcfce7' },
    textSubmitted: { color: '#166534' },
    badgeRejected: { backgroundColor: '#fee2e2' },
    textRejected: { color: '#991b1b' },
    wardText: { fontSize: 14, color: '#64748b', fontWeight: '700', marginTop: 2 },
    lastInspectionText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
    footer: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    distanceText: { fontSize: 12, color: '#94a3b8', fontWeight: '800' },
    actionText: { fontSize: 12, fontWeight: '900', color: '#1d4ed8' },
    error: { color: '#ef4444', textAlign: 'center', marginBottom: 20 },
    retryBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    retryBtnText: { color: '#fff', fontWeight: '700' },
    empty: { flex: 1, alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    emptySub: { textAlign: 'center', color: '#64748b', marginTop: 10, paddingHorizontal: 40, lineHeight: 20 },
    tabToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 20, padding: 4 },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    tabTextActive: { color: '#1d4ed8' },
    routeContainer: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
    routeLine: { position: 'absolute', top: 34, left: 30, right: 30, height: 2, backgroundColor: '#e2e8f0' },
    routePoints: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, position: 'relative' },
    routePointContainer: { alignItems: 'center', width: 40 },
    routeDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', marginBottom: 4, zIndex: 1 },
    routeDotDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
    routeIndex: { fontSize: 12, fontWeight: '800', color: '#64748b' },
    routeLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textAlign: 'center', width: 50 },
    routeTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginTop: 8 }
});

