import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Home, PlusCircle, Clock, LayoutList, Map as MapIcon, Sparkles, MapPin, Lightbulb, CheckCircle2, FileText } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { ToiletApi } from '../../../api/modules';
import { useAuthContext } from '../../../auth/AuthProvider';

// Import Screens
import ToiletEmployeeHome from './ToiletEmployeeHome';
import ToiletMyRequestsScreen from './ToiletMyRequestsScreen';
import ToiletRegisterScreen from './ToiletRegisterScreen';
import ToiletProfileScreen from './ToiletProfileScreenFinal';
import { User } from 'lucide-react-native';

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

    if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.welcomeSub}>OPERATIONAL OVERVIEW</Text>
                    <Text style={styles.welcomeTitle}>Daily Analytics</Text>
                </View>

                {/* Primary Metric - Coverage */}
                <View style={[styles.mainMetricCard, { backgroundColor: '#1e293b' }]}>
                    <View style={styles.metricRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>ACTIVE SUPERVISION</Text>
                            <Text style={[styles.valueLarge, { color: '#fff' }]}>{stats?.totalWards || 0} Wards</Text>
                            <Text style={[styles.subText, { color: '#64748b', marginTop: 4 }]}>
                                {stats?.wardNames ? stats.wardNames : "Checking current progress..."}
                            </Text>
                        </View>
                        <View style={styles.metricIconWrap}>
                            <MapIcon size={28} color="#fff" strokeWidth={1.5} />
                        </View>
                    </View>
                </View>

                {/* Performance Card */}
                <View style={styles.glassCard}>
                    <View style={styles.performanceRow}>
                        <View style={styles.ratingCircle}>
                            <Sparkles size={22} color="#7c3aed" strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.label}>PERFORMANCE STATUS</Text>
                            <Text style={[styles.value, { color: '#7c3aed', fontSize: 22 }]}>{stats?.performance || "Calculating..."}</Text>
                        </View>
                    </View>
                </View>

                {/* Statistics Grid */}
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#fff7ed' }]}>
                            <MapPin size={18} color="#f59e0b" strokeWidth={2} />
                        </View>
                        <Text style={styles.gridLabel}>ASSIGNED</Text>
                        <Text style={[styles.gridValue, { color: '#0f172a' }]}>{stats?.totalAssigned || 0}</Text>
                        <Text style={styles.gridSub}>Total Toilets</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                            <Lightbulb size={18} color="#3b82f6" strokeWidth={2} />
                        </View>
                        <Text style={styles.gridLabel}>REQUESTS</Text>
                        <Text style={[styles.gridValue, { color: '#0f172a' }]}>{stats?.totalRequested || 0}</Text>
                        <Text style={styles.gridSub}>New Toilets</Text>
                    </View>
                </View>

                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
                            <CheckCircle2 size={18} color="#10b981" strokeWidth={2} />
                        </View>
                        <Text style={styles.gridLabel}>VERIFIED</Text>
                        <Text style={[styles.gridValue, { color: '#0f172a' }]}>{stats?.totalApproved || 0}</Text>
                        <Text style={styles.gridSub}>Approved</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <View style={[styles.iconBox, { backgroundColor: '#eef2ff' }]}>
                            <FileText size={18} color="#6366f1" strokeWidth={2} />
                        </View>
                        <Text style={styles.gridLabel}>REPORTS</Text>
                        <Text style={[styles.gridValue, { color: '#0f172a' }]}>{stats?.totalSubmitted || 0}</Text>
                        <Text style={styles.gridSub}>Submitted</Text>
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// Custom Tab Container
export default function ToiletEmployeeTabs({ navigation }: { navigation: Nav }) {
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'REGISTER' | 'STATUS' | 'ASSIGNED' | 'PROFILE'>('DASHBOARD');

    const renderContent = () => {
        switch (activeTab) {
            case 'DASHBOARD': return <DashboardScreen />;
            case 'REGISTER': return <ToiletRegisterScreen navigation={navigation} />;
            case 'STATUS': return <ToiletMyRequestsScreen navigation={navigation} />;
            case 'ASSIGNED': return <ToiletEmployeeHome navigation={navigation} />;
            case 'PROFILE': return <ToiletProfileScreen />;
            default: return <DashboardScreen />;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('DASHBOARD')}>
                    <Home size={20} color={activeTab === 'DASHBOARD' ? "#1d4ed8" : "#94a3b8"} strokeWidth={activeTab === 'DASHBOARD' ? 2.5 : 2} />
                    <Text style={[styles.tabLabel, activeTab === 'DASHBOARD' && styles.activeTabLabel]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('REGISTER')}>
                    <PlusCircle size={20} color={activeTab === 'REGISTER' ? "#1d4ed8" : "#94a3b8"} strokeWidth={activeTab === 'REGISTER' ? 2.5 : 2} />
                    <Text style={[styles.tabLabel, activeTab === 'REGISTER' && styles.activeTabLabel]}>Register</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('ASSIGNED')}>
                    <LayoutList size={20} color={activeTab === 'ASSIGNED' ? "#1d4ed8" : "#94a3b8"} strokeWidth={activeTab === 'ASSIGNED' ? 2.5 : 2} />
                    <Text style={[styles.tabLabel, activeTab === 'ASSIGNED' && styles.activeTabLabel]}>Assets</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('STATUS')}>
                    <Clock size={20} color={activeTab === 'STATUS' ? "#1d4ed8" : "#94a3b8"} strokeWidth={activeTab === 'STATUS' ? 2.5 : 2} />
                    <Text style={[styles.tabLabel, activeTab === 'STATUS' && styles.activeTabLabel]}>Status</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('PROFILE')}>
                    <User size={20} color={activeTab === 'PROFILE' ? "#1d4ed8" : "#94a3b8"} strokeWidth={activeTab === 'PROFILE' ? 2.5 : 2} />
                    <Text style={[styles.tabLabel, activeTab === 'PROFILE' && styles.activeTabLabel]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fcfdfe' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, paddingTop: 5 },
    welcomeSection: { marginBottom: 16, marginTop: 5 },
    welcomeSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 2 },
    welcomeTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    mainMetricCard: { borderRadius: 24, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    metricRow: { flexDirection: 'row', alignItems: 'center' },
    metricIconWrap: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    glassCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    performanceRow: { flexDirection: 'row', alignItems: 'center' },
    ratingCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 2 },
    value: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    valueLarge: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    gridItem: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: '48%', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gridLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 2 },
    gridValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
    gridSub: { fontSize: 10, color: '#bcc6d2', fontWeight: '600', marginTop: 2 },
    tabBar: { height: 75, backgroundColor: '#fff', flexDirection: 'row', paddingBottom: Platform.OS === 'ios' ? 20 : 8, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tabLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 3 },
    activeTabLabel: { color: '#1d4ed8' }
});
