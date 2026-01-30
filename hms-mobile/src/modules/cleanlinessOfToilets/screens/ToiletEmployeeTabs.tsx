import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { ToiletApi } from '../../../api/modules';
import { useAuthContext } from '../../../auth/AuthProvider';

// Import Screens
import ToiletEmployeeHome from './ToiletEmployeeHome';
import ToiletMyRequestsScreen from './ToiletMyRequestsScreen';
import ToiletRegisterScreen from './ToiletRegisterScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Dashboard Screen Component
function DashboardScreen() {
    const { auth } = useAuthContext();
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

    // Prefer stats city name (from Backend) over auth context if auth is missing it
    const authCity = auth.status === 'authenticated' ? auth.cityName : undefined;
    const displayName = stats?.cityName || authCity || "Loading City...";

    if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Overview</Text>
            </View>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Area Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>ASSIGNED AREA</Text>
                    <Text style={styles.valueLarge}>{stats?.totalWards || 0} Wards</Text>
                    <Text style={[styles.subText, { lineHeight: 18 }]}>
                        {stats?.wardNames ? stats.wardNames : "Under your supervision"}
                    </Text>
                </View>

                {/* Performance Card */}
                <View style={styles.card}>
                    <Text style={styles.label}>PERFORMANCE RATING</Text>
                    <Text style={[styles.value, { color: '#7c3aed' }]}>{stats?.performance || "Not Rated"}</Text>
                    <Text style={styles.subText}>Based on approved inspections and reports</Text>
                </View>

                {/* Grid Stats */}
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>ASSIGNED</Text>
                        <Text style={[styles.value, { color: '#f59e0b' }]}>{stats?.totalAssigned || 0}</Text>
                        <Text style={styles.subText}>Toilets</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>REQUESTED</Text>
                        <Text style={[styles.value, { color: '#3b82f6' }]}>{stats?.totalRequested || 0}</Text>
                        <Text style={styles.subText}>New</Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>APPROVED</Text>
                        <Text style={[styles.value, { color: '#10b981' }]}>{stats?.totalApproved || 0}</Text>
                        <Text style={styles.subText}>Verified</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>SUBMITTED</Text>
                        <Text style={[styles.value, { color: '#64748b' }]}>{stats?.totalSubmitted || 0}</Text>
                        <Text style={styles.subText}>Reports</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// Custom Tab Container
export default function ToiletEmployeeTabs({ navigation }: { navigation: Nav }) {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'REGISTER' | 'STATUS' | 'ASSIGNED'>('DASHBOARD');

    const renderContent = () => {
        switch (activeTab) {
            case 'DASHBOARD': return <DashboardScreen />;
            case 'REGISTER': return <ToiletRegisterScreen navigation={navigation} />;
            case 'STATUS': return <ToiletMyRequestsScreen navigation={navigation} />;
            case 'ASSIGNED': return <ToiletEmployeeHome navigation={navigation} />;
            default: return <DashboardScreen />;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Content Area */}
            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>

            {/* Custom Bottom Tab Bar - Sleek */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setActiveTab('DASHBOARD')}
                >
                    <Text style={{ fontSize: 22, opacity: activeTab === 'DASHBOARD' ? 1 : 0.5 }}>🏠</Text>
                    <Text style={[styles.tabLabel, activeTab === 'DASHBOARD' && styles.activeTab]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setActiveTab('REGISTER')}
                >
                    <Text style={{ fontSize: 22, opacity: activeTab === 'REGISTER' ? 1 : 0.5 }}>➕</Text>
                    <Text style={[styles.tabLabel, activeTab === 'REGISTER' && styles.activeTab]}>Register</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setActiveTab('STATUS')}
                >
                    <Text style={{ fontSize: 22, opacity: activeTab === 'STATUS' ? 1 : 0.5 }}>🕒</Text>
                    <Text style={[styles.tabLabel, activeTab === 'STATUS' && styles.activeTab]}>Status</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tabItem}
                    onPress={() => setActiveTab('ASSIGNED')}
                >
                    <Text style={{ fontSize: 22, opacity: activeTab === 'ASSIGNED' ? 1 : 0.5 }}>📍</Text>
                    <Text style={[styles.tabLabel, activeTab === 'ASSIGNED' && styles.activeTab]}>Assigned</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        height: Platform.OS === 'android' ? 100 : 70,
        paddingTop: Platform.OS === 'android' ? 50 : 10,
        backgroundColor: '#fff',
        justifyContent: 'center',
        paddingHorizontal: 24,
        // No border, just subtle shadow or none
        elevation: 0,
        borderBottomWidth: 0
    },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a' },

    content: { padding: 24 },

    // Sleek Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#64748b',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2
    },
    label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
    value: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
    valueLarge: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
    subRow: { flexDirection: 'row', alignItems: 'center' },
    subText: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 4 },

    pill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
    pillText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },

    // Grid System
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    gridItem: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        width: '48%',
        shadowColor: '#64748b', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2
    },

    // Tab Bar Styles
    tabBar: {
        height: 90,
        backgroundColor: '#fff',
        flexDirection: 'row',
        paddingTop: 16,
        paddingBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 15,
        borderTopLeftRadius: 24, borderTopRightRadius: 24
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94a3b8',
        marginTop: 6
    },
    activeTab: {
        color: '#1d4ed8',
        fontWeight: '700'
    }
});
