import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import ToiletEmployeeHome from './ToiletEmployeeHome';
import ToiletMyRequestsScreen from './ToiletMyRequestsScreen';
import ToiletRegisterScreen from './ToiletRegisterScreen';
import { useAuthContext } from '../../auth/AuthProvider';
import { ToiletApi } from '../../api/modules';
import { useFocusEffect } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Ward {
    id: string;
    name: string;
    zoneName: string;
    toiletCount: number;
}

// Dashboard Screen
function DashboardScreen() {
    const [stats, setStats] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    const loadStats = async () => {
        try {
            const res = await ToiletApi.getDashboardStats();
            setStats(res);
        } catch (e) { console.log(e); } finally { setLoading(false); }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
        }, [])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📊 My Dashboard</Text>
            </View>
            <View style={styles.content}>
                <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
                    <Text style={styles.statLabel}>ASSIGNED AREA</Text>
                    <Text style={styles.statValue}>{stats?.totalWards || 0}</Text>
                    <Text style={styles.statSub}>Wards across {stats?.totalZones || 0} Zones</Text>
                </View>
                <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
                    <Text style={styles.statLabel}>MY TOILETS</Text>
                    <Text style={styles.statValue}>{stats?.totalToilets || 0}</Text>
                    <Text style={styles.statSub}>Total Assets Assigned</Text>
                </View>
                <View style={styles.row}>
                    <View style={[styles.statCard, { flex: 1, marginRight: 8, borderLeftColor: '#f59e0b' }]}>
                        <Text style={styles.statLabel}>PENDING</Text>
                        <Text style={styles.statValue}>{stats?.pendingReports || 0}</Text>
                    </View>
                    <View style={[styles.statCard, { flex: 1, marginLeft: 8, borderLeftColor: '#10b981' }]}>
                        <Text style={styles.statLabel}>DONE</Text>
                        <Text style={styles.statValue}>{stats?.approvedReports || 0}</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

// User/Profile Screen
function UserScreen({ navigation }: { navigation: Nav }) {
    const { logout, auth } = useAuthContext();

    const handleLogout = async () => {
        await logout();
        navigation.replace('Login');
    };

    return (
        <SafeAreaView style={styles.screen}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <View style={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>E</Text>
                    </View>
                    <Text style={styles.profileName}>Employee</Text>
                    <Text style={styles.profileEmail}>
                        {auth.status === 'authenticated' ? auth.cityName : ''}
                    </Text>
                    <Text style={styles.profileRole}>EMPLOYEE</Text>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 LOGOUT</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

export default function ToiletEmployeeTabs({ navigation }: { navigation: Nav }) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#1d4ed8',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: {
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#e2e8f0',
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarLabel: '📊 Dashboard',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tab.Screen
                name="Register"
                component={ToiletRegisterScreen}
                options={{
                    tabBarLabel: '➕ Register',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>➕</Text>,
                }}
            />
            <Tab.Screen
                name="Status"
                component={ToiletMyRequestsScreen}
                options={{
                    tabBarLabel: '📋 My Requests',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
                }}
            />
            <Tab.Screen
                name="Tasks"
                component={ToiletEmployeeHome}
                options={{
                    tabBarLabel: '🚽 My Toilets',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>📍</Text>,
                }}
            />
            <Tab.Screen
                name="InspectionForm"
                children={() => (
                    <View style={styles.center}>
                        <Text style={{ fontSize: 24 }}>📝</Text>
                        <Text style={styles.emptyText}>Select a toilet from the 'Assigned' tab to start an inspection.</Text>
                    </View>
                )}
                options={{
                    tabBarLabel: 'Report Form',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>�</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    row: { flexDirection: 'row' },
    header: { height: 64, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    content: { flex: 1, padding: 20 },
    statCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginBottom: 16, borderLeftWidth: 6, borderLeftColor: '#1d4ed8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    statLabel: { fontSize: 11, fontWeight: '900', color: '#64748b', marginBottom: 8 },
    statValue: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    statSub: { fontSize: 14, color: '#94a3b8' },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 10, paddingHorizontal: 40 },
    profileCard: { backgroundColor: '#fff', padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1d4ed8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
    profileName: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    profileEmail: { fontSize: 14, color: '#64748b', marginBottom: 12 },
    profileRole: { fontSize: 10, fontWeight: '900', color: '#1d4ed8', backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    logoutButton: { backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center' },
    logoutText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
