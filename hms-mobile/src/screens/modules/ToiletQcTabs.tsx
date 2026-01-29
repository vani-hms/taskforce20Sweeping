import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ToiletApi } from '../../api/modules';
import { useFocusEffect } from '@react-navigation/native';
import ToiletHomeScreen from './ToiletHomeScreen';
import ToiletPendingRegistrationScreen from './ToiletPendingRegistrationScreen';
import ToiletMasterScreen from './ToiletMasterScreen';

const Tab = createBottomTabNavigator();

type Nav = NativeStackNavigationProp<RootStackParamList>;

// QC Metric Dashboard Screen
function MetricsScreen() {
    const [stats, setStats] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    const load = async () => {
        try {
            const res = await ToiletApi.getDashboardStats();
            setStats(res);
        } catch (e) { } finally { setLoading(false); }
    };

    useFocusEffect(React.useCallback(() => { load(); }, []));

    if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}><Text style={styles.headerTitle}>QC Dashboard</Text></View>
            <View style={styles.content}>
                <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
                    <Text style={styles.statLabel}>PENDING AUDITS</Text>
                    <Text style={styles.statValue}>{stats?.pendingReports || 0}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
                    <Text style={styles.statLabel}>PENDING REGISTRATIONS</Text>
                    <Text style={styles.statValue}>{stats?.pendingRegistrations || 0}</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
                    <Text style={styles.statLabel}>TOTAL TOILETS</Text>
                    <Text style={styles.statValue}>{stats?.totalToilets || 0}</Text>
                </View>
                <View style={styles.row}>
                    <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.statLabel}>WARDS</Text>
                        <Text style={styles.statValue}>{stats?.totalWards || 0}</Text>
                    </View>
                    <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.statLabel}>ZONES</Text>
                        <Text style={styles.statValue}>{stats?.totalZones || 0}</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

// Staff Management Screen
function StaffScreen() {
    const [staff, setStaff] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const load = async () => {
        try {
            const res = await ToiletApi.listEmployees();
            setStaff(res.employees || []);
        } catch (e) { } finally { setLoading(false); }
    };

    useFocusEffect(React.useCallback(() => { load(); }, []));

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}><Text style={styles.headerTitle}>Staff Management</Text></View>
            <FlatList
                data={staff}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View style={styles.staffCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.staffName}>{item.name}</Text>
                            <Text style={styles.staffEmail}>{item.email}</Text>
                            <Text style={styles.staffStats}>Wards: {item.assignedWardIds.length} | Toilets: {item.toiletsAssigned}</Text>
                        </View>
                        <TouchableOpacity style={styles.actionBtn}>
                            <Text style={styles.actionText}>VIEW</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No employees assigned to your wards.</Text>}
                onRefresh={load}
                refreshing={loading}
            />
        </SafeAreaView>
    );
}

export default function ToiletQcTabs({ navigation }: { navigation: Nav }) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#1d4ed8',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 8 },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
            }}
        >
            <Tab.Screen
                name="Metrics"
                component={MetricsScreen}
                options={{
                    tabBarLabel: 'Dashboard',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
                }}
            />
            <Tab.Screen
                name="Staff"
                component={StaffScreen}
                options={{
                    tabBarLabel: 'Staff',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
                }}
            />
            <Tab.Screen
                name="Audits"
                component={ToiletHomeScreen}
                options={{
                    tabBarLabel: 'Reports',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>✅</Text>,
                }}
            />
            <Tab.Screen
                name="Registrations"
                component={ToiletPendingRegistrationScreen}
                options={{
                    tabBarLabel: 'Registrations',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚽</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { height: 64, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    content: { padding: 16 },
    statCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: '#1d4ed8', elevation: 2 },
    statLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', marginBottom: 4 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    row: { flexDirection: 'row' },
    staffCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    staffName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    staffEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
    staffStats: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 6 },
    actionBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionText: { color: '#1d4ed8', fontSize: 11, fontWeight: '900' },
    empty: { textAlign: 'center', marginTop: 40, color: '#94a3b8' }
});
