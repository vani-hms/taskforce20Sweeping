import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { getModuleRecords } from "../../../api/auth";
import { MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart2, Filter } from "lucide-react-native";

export default function TwinbinAdminDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

    const loadData = async () => {
        try {
            const res = await getModuleRecords("twinbin");
            setRecords(res.records || []);
        } catch (e) {
            console.log("Failed to load records", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const stats = useMemo(() => {
        return {
            total: records.length,
            pending: records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING').length,
            approved: records.filter(r => r.status === 'APPROVED').length,
            rejected: records.filter(r => r.status === 'REJECTED').length,
            actionRequired: records.filter(r => r.status === 'ACTION_REQUIRED').length,
        };
    }, [records]);

    const zoneStats = useMemo(() => {
        const zones: Record<string, { total: number; pending: number; name: string }> = {};
        records.forEach(r => {
            const zone = r.zoneName || "Unknown Zone";
            if (!zones[zone]) zones[zone] = { total: 0, pending: 0, name: zone };
            zones[zone].total++;
            if (r.status === 'PENDING_QC' || r.status === 'PENDING') zones[zone].pending++;
        });
        return Object.values(zones).sort((a, b) => b.total - a.total);
    }, [records]);

    const filteredRecords = useMemo(() => {
        if (activeTab === 'ALL') return records;
        if (activeTab === 'PENDING') return records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING');
        return records.filter(r => r.status === activeTab);
    }, [records, activeTab]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: Spacing.xl }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.eyebrow}>Module · Litter Bins</Text>
                <Text style={styles.title}>City Governance</Text>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                <View style={styles.kpiRow}>
                    <KpiCard label="Total Bins" value={stats.total} />
                    <KpiCard label="Pending" value={stats.pending} color={Colors.warning} />
                </View>
                <View style={styles.kpiRow}>
                    <KpiCard label="Approved" value={stats.approved} color={Colors.success} />
                    <KpiCard label="Rejected" value={stats.rejected} color={Colors.error} />
                </View>
                <KpiCard label="Action Required" value={stats.actionRequired} highlight />
            </View>

            {/* Zone Breakdown */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Zone Breakdown</Text>
                <View style={styles.card}>
                    {zoneStats.map((z, i) => (
                        <View key={z.name} style={[styles.zoneRow, i !== zoneStats.length - 1 && styles.borderBottom]}>
                            <Text style={styles.zoneName}>{z.name}</Text>
                            <View style={styles.zoneStats}>
                                <Text style={styles.statLabel}>Total: <Text style={styles.statValue}>{z.total}</Text></Text>
                                {z.pending > 0 && <Text style={[styles.statLabel, { color: Colors.warning }]}>Pending: {z.pending}</Text>}
                            </View>
                        </View>
                    ))}
                    {zoneStats.length === 0 && <Text style={styles.emptyText}>No zone data available</Text>}
                </View>
            </View>

            {/* Reports View */}
            <View style={styles.section}>
                <View style={styles.tabsHeader}>
                    <Text style={styles.sectionTitle}>Bin Records</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                        <TabButton title="All" active={activeTab === 'ALL'} onPress={() => setActiveTab('ALL')} />
                        <TabButton title="Pending" active={activeTab === 'PENDING'} onPress={() => setActiveTab('PENDING')} />
                        <TabButton title="Appr" active={activeTab === 'APPROVED'} onPress={() => setActiveTab('APPROVED')} />
                        <TabButton title="Rej" active={activeTab === 'REJECTED'} onPress={() => setActiveTab('REJECTED')} />
                    </ScrollView>
                </View>

                <View style={{ gap: Spacing.m }}>
                    {filteredRecords.slice(0, 50).map((r) => (
                        <View key={r.id} style={styles.recordCard}>
                            <View style={styles.recordHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.areaName}>{r.areaName}</Text>
                                    <Text style={styles.locationName}>{r.locationName || "—"}</Text>
                                </View>
                                <StatusBadge status={r.status} />
                            </View>
                            <View style={styles.recordFooter}>
                                <Text style={styles.metaText}>{r.zoneName || "—"} • {r.wardName || "—"}</Text>
                                <Text style={styles.metaText}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    ))}
                    {filteredRecords.length === 0 && (
                        <Text style={styles.emptyText}>No records found</Text>
                    )}
                    {filteredRecords.length > 50 && (
                        <Text style={[styles.metaText, { textAlign: 'center', marginTop: Spacing.s }]}>Showing first 50 records</Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

function KpiCard({ label, value, color, highlight }: { label: string; value: number; color?: string; highlight?: boolean }) {
    return (
        <View style={[styles.kpiCard, highlight && styles.highlightBorder]}>
            <Text style={[styles.kpiValue, color && { color }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </View>
    );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={onPress}
        >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
        </TouchableOpacity>
    );
}

function StatusBadge({ status }: { status: string }) {
    let color = Colors.textMuted;
    let bg = Colors.background;

    if (status === "APPROVED") { color = Colors.success; bg = Colors.successLight + "20"; }
    if (status === "PENDING_QC" || status === "PENDING") { color = Colors.warning; bg = Colors.warningLight + "20"; }
    if (status === "REJECTED") { color = Colors.error; bg = Colors.errorLight + "20"; }
    if (status === "ACTION_REQUIRED") { color = Colors.info; bg = Colors.infoLight + "20"; }

    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color }]}>{status?.replace(/_/g, " ")}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: Layout.screenContainer,
    header: { marginBottom: Spacing.l },
    eyebrow: { ...Typography.caption, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: Spacing.xs },
    title: { ...Typography.h1, color: Colors.primary },

    kpiGrid: { gap: Spacing.m, marginBottom: Spacing.xl },
    kpiRow: { flexDirection: 'row', gap: Spacing.m },
    kpiCard: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: Spacing.m,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.05,
        elevation: 2
    },
    highlightBorder: {
        borderWidth: 1,
        borderColor: Colors.primary
    },
    kpiValue: { ...Typography.h1, marginBottom: 4 },
    kpiLabel: { ...Typography.caption, textTransform: 'uppercase' },

    section: { marginBottom: Spacing.xl },
    sectionTitle: { ...Typography.h2, marginBottom: Spacing.m },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 8,
        padding: Spacing.m,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        elevation: 1
    },
    zoneRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.s,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border
    },
    zoneName: { ...Typography.bodyBold },
    zoneStats: { flexDirection: 'row', gap: Spacing.m },
    statLabel: { ...Typography.caption, color: Colors.textMuted },
    statValue: { color: Colors.text },
    emptyText: { ...Typography.caption, textAlign: 'center', color: Colors.textMuted, padding: Spacing.m },

    tabsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.m },
    tabsContainer: { gap: Spacing.s, paddingHorizontal: Spacing.s },
    tabButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.background,
    },
    tabButtonActive: {
        backgroundColor: Colors.primary,
    },
    tabText: { ...Typography.caption, fontWeight: '600', color: Colors.textMuted },
    tabTextActive: { color: Colors.white },

    recordCard: {
        backgroundColor: Colors.white,
        padding: Spacing.m,
        borderRadius: 12,
        gap: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border
    },
    recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    areaName: { ...Typography.bodyBold },
    locationName: { ...Typography.caption, color: Colors.textMuted },
    recordFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
    metaText: { ...Typography.caption, color: Colors.textMuted },

    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase'
    }
});
