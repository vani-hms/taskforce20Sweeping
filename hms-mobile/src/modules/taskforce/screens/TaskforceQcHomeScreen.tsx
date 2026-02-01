import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { getTaskforceRecords, ApiError, submitTaskforceReport, approveTaskforceReport, rejectTaskforceReport } from "../../../api/auth";
import { ListChecks, AlertTriangle, FileText, CheckCircle, XCircle, Clock } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TaskforceHome">;

export default function TaskforceQcHomeScreen({ navigation }: any) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [activeTab, setActiveTab] = useState<'DAILY_REPORTS' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HISTORY'>('PENDING');
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; actionRequired: number; total: number } | null>(null);

    const loadData = useCallback(async (pageNum: number, tab: string, refresh = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const res = await getTaskforceRecords({ page: pageNum, limit: 10, tab });

            if (refresh) {
                setRecords(res.data);
            } else {
                setRecords(prev => [...prev, ...res.data]);
            }

            if (res.meta) {
                setHasMore(pageNum < res.meta.totalPages);
                setStats(res.stats);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        setPage(1);
        loadData(1, activeTab, true);
    }, [activeTab]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadData(nextPage, activeTab);
        }
    };

    const handleAction = async (id: string, type: 'FEEDER_POINT' | 'FEEDER_REPORT', action: 'APPROVE' | 'REJECT') => {
        try {
            if (type === 'FEEDER_REPORT') {
                if (action === 'APPROVE') await approveTaskforceReport(id);
                else await rejectTaskforceReport(id);
                Alert.alert("Success", `Report ${action.toLowerCase()}d`);
                setRecords(prev => prev.filter(r => r.id !== id));
            } else {
                Alert.alert("Notice", "Feeder Point approval not yet supported in mobile.");
            }
        } catch (err) {
            Alert.alert("Error", "Action failed");
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[Layout.card, styles.itemCard]}>
            <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {item.type === 'FEEDER_POINT' ? <ListChecks size={16} color={Colors.primary} /> : <FileText size={16} color={Colors.secondary} />}
                    <Text style={styles.itemType}>{item.type === 'FEEDER_POINT' ? "Feeder Point" : "Report"}</Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <Text style={Typography.h3}>{item.areaName}</Text>
            <Text style={[Typography.body, { color: Colors.textMuted }]}>{item.locationName}</Text>

            <View style={styles.metaRow}>
                <Text style={styles.metaText}>{item.zoneName || "No Zone"} • {item.wardName || "No Ward"}</Text>
                <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>

            {(item.status === 'PENDING_QC' || item.status === 'SUBMITTED') && (
                <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => handleAction(item.id, item.type, 'APPROVE')} style={[styles.localButton, { backgroundColor: Colors.success }]}>
                        <Text style={styles.localButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAction(item.id, item.type, 'REJECT')} style={[styles.localButton, { backgroundColor: Colors.danger }]}>
                        <Text style={styles.localButtonText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Taskforce QC</Text>
            </View>

            {/* KPI Row */}
            <View style={styles.kpiRow}>
                <KpiBox label="Pending" value={stats?.pending || 0} color={Colors.warning} />
                <KpiBox label="Approved" value={stats?.approved || 0} color={Colors.success} />
                <KpiBox label="Rejected" value={stats?.rejected || 0} color={Colors.danger} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsScroll}>
                {['DAILY_REPORTS', 'PENDING', 'APPROVED', 'REJECTED', 'HISTORY'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab as any)}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={records}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: Spacing.m, paddingBottom: 100 }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} /> : null}
                ListEmptyComponent={!loading ? <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.textMuted }}>No records found</Text> : <ActivityIndicator style={{ marginTop: 50 }} color={Colors.primary} />}
            />
        </View>
    );
}

function KpiBox({ label, value, color }: any) {
    return (
        <View style={[Layout.card, { flex: 1, padding: Spacing.s, alignItems: 'center', marginHorizontal: 4 }]}>
            <Text style={[Typography.h2, { color }]}>{value}</Text>
            <Text style={{ fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' }}>{label}</Text>
        </View>
    );
}

function StatusBadge({ status }: { status: string }) {
    let color = Colors.textMuted;
    if (status === 'APPROVED') color = Colors.success;
    if (status === 'PENDING_QC' || status === 'SUBMITTED') color = Colors.warning;
    if (status === 'REJECTED') color = Colors.danger;

    return (
        <View style={{ backgroundColor: color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ color: color, fontSize: 10, fontWeight: 'bold' }}>{status}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { padding: Spacing.l, paddingBottom: Spacing.s },
    title: { ...Typography.h1, color: Colors.primary },
    kpiRow: { flexDirection: 'row', paddingHorizontal: Spacing.m, marginBottom: Spacing.m },
    tabsScroll: { flexDirection: 'row', paddingHorizontal: Spacing.m, marginBottom: Spacing.s },
    tab: { marginRight: Spacing.s, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: Colors.card },
    activeTab: { backgroundColor: Colors.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
    activeTabText: { color: Colors.white },
    itemCard: { marginBottom: Spacing.m },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.s },
    itemType: { fontSize: 12, fontWeight: '600', color: Colors.text },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.s },
    metaText: { fontSize: 12, color: Colors.textMuted },
    actionRow: { flexDirection: 'row', gap: Spacing.m, marginTop: Spacing.m, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.s },
    localButton: { flex: 1, paddingVertical: 8, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    localButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});
