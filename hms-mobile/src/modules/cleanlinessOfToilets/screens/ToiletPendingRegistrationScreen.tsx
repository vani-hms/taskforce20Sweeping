import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Alert } from "react-native";
import { ToiletApi } from "../../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletPendingRegistrationScreen({ navigation }: { navigation: Nav }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (isRef = false) => {
        if (!isRef) setLoading(true);
        try {
            const res = await ToiletApi.listPendingToilets();
            setRequests(res.toilets || []);
        } catch (e) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleApprove = (id: string) => {
        Alert.alert("Confirm", "Approve this registration?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Approve", onPress: async () => {
                    try {
                        await ToiletApi.approveToilet(id, {});
                        Alert.alert("Success", "Approved and added to master.");
                        load();
                    } catch (e) { Alert.alert("Error", "Approval failed."); }
                }
            }
        ]);
    };

    const handleReject = (id: string) => {
        Alert.prompt("Reject Request", "Enter reason for rejection", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Reject", style: "destructive", onPress: async (remarks: string | undefined) => {
                    try {
                        await ToiletApi.rejectToilet(id, remarks || "");
                        Alert.alert("Rejected", "Request has been rejected.");
                        load();
                    } catch (e) { Alert.alert("Error", "Action failed."); }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.typeTag}>{item.type}</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.detailText}>📍 {item.ward?.name || 'Unknown Ward'}</Text>
                <Text style={styles.detailText}>👤 Requested by: {item.requestedBy?.name || 'Employee'}</Text>
                <Text style={styles.detailText}>🚻 {item.gender} | 🪑 {item.numberOfSeats} Seats</Text>
                <Text style={styles.dateText}>On {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.rejBtn} onPress={() => handleReject(item.id)}>
                    <Text style={styles.rejBtnText}>REJECT</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.appBtn} onPress={() => handleApprove(item.id)}>
                    <Text style={styles.appBtnText}>APPROVE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <Text style={styles.title}>Registration Requests</Text>
                <View style={{ width: 40 }} />
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
                            <Text style={styles.emptyTitle}>No Pending Requests</Text>
                            <Text style={styles.emptySub}>All registration requests have been processed.</Text>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    typeTag: { fontSize: 9, fontWeight: '900', color: '#1d4ed8', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    details: { gap: 4 },
    detailText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    dateText: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    rejBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fef2f2', alignItems: 'center' },
    rejBtnText: { color: '#dc2626', fontSize: 11, fontWeight: '900' },
    appBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1d4ed8', alignItems: 'center' },
    appBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8, paddingHorizontal: 40, textAlign: 'center' }
});
