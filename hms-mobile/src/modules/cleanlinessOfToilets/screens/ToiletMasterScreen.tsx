import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, RefreshControl, Alert } from "react-native";
import { ToiletApi } from "../../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletMasterScreen({ navigation }: { navigation: Nav }) {
    const [toilets, setToilets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async (isRef = false) => {
        if (!isRef) setLoading(true);
        try {
            const res = await ToiletApi.listToilets();
            setToilets(res.toilets || []);
        } catch (e) {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.ward}>{item.ward?.name || 'Unknown Ward'}</Text>
                <Text style={styles.type}>{item.type} | {item.gender}</Text>
            </View>
            <TouchableOpacity
                style={styles.assignBtn}
                onPress={() => Alert.alert("Assign", "Assign functionality would open a user selection list.")}
            >
                <Text style={styles.assignText}>ASSIGN</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <Text style={styles.title}>Cleanliness of Toilets</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("ToiletRegister")}>
                    <Text style={styles.addBtnText}>+ ADD</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
            ) : (
                <FlatList
                    data={toilets}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>No Toilets Found</Text>
                            <Text style={styles.emptySub}>Register toilets to see them in the master list.</Text>
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
    addBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    ward: { fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 },
    type: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
    assignBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    assignText: { color: '#1d4ed8', fontSize: 11, fontWeight: '900' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    emptySub: { fontSize: 14, color: '#94a3b8', marginTop: 8, paddingHorizontal: 40, textAlign: 'center' }
});
