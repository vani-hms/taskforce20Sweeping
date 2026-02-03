import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Linking } from "react-native";
import { useAuthContext } from "../../../auth/AuthProvider";
import { ToiletApi } from "../../../api/modules";
import { Phone, User, MapPin } from "lucide-react-native";

export default function ToiletProfileScreen() {
    const { auth, logout } = useAuthContext();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await ToiletApi.getDashboardStats();
            setStats(res);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phone?: string) => {
        if (phone) Linking.openURL(`tel:${phone}`);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* User Profile Card */}
                <View style={styles.card}>
                    <View style={styles.avatar}>
                        <User size={32} color="#fff" />
                    </View>
                    <Text style={styles.userName}>{stats?.employeeName || "Employee"}</Text>
                    <Text style={styles.userRole}>Official Staff</Text>

                    <View style={styles.infoRow}>
                        <MapPin size={16} color="#64748b" />
                        <Text style={styles.infoText}>{stats?.cityName || "Unknown City"}</Text>
                    </View>
                </View>

                {/* Assigned Wards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ASSIGNED WARDS</Text>
                    <View style={styles.wardCard}>
                        <MapPin size={20} color="#1d4ed8" />
                        <Text style={styles.wardText}>{stats?.wardNames || "No Wards Assigned"}</Text>
                    </View>
                </View>

                {/* Support Staff (QC & AO) */}
                {stats?.supportStaff && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>YOUR SUPPORT TEAM</Text>

                        {/* QC List */}
                        {stats.supportStaff.qc?.length > 0 && (
                            <View style={styles.staffGroup}>
                                <Text style={styles.staffLabel}>Quality Controllers (QC)</Text>
                                {stats.supportStaff.qc.map((qc: any, i: number) => (
                                    <View key={i} style={styles.staffRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.staffName}>{qc.name}</Text>
                                            <Text style={styles.staffPhone}>{qc.phone || "No phone"}</Text>
                                        </View>
                                        {qc.phone && (
                                            <TouchableOpacity onPress={() => handleCall(qc.phone)} style={styles.callBtn}>
                                                <Phone size={16} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* AO List */}
                        {stats.supportStaff.ao?.length > 0 && (
                            <View style={styles.staffGroup}>
                                <Text style={styles.staffLabel}>Action Officers (AO)</Text>
                                {stats.supportStaff.ao.map((ao: any, i: number) => (
                                    <View key={i} style={styles.staffRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.staffName}>{ao.name}</Text>
                                            <Text style={styles.staffPhone}>{ao.phone || "No phone"}</Text>
                                        </View>
                                        {ao.phone && (
                                            <TouchableOpacity onPress={() => handleCall(ao.phone)} style={styles.callBtn}>
                                                <Phone size={16} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: '#1d4ed8',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12
    },
    userName: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    userRole: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    infoText: { fontSize: 13, color: '#475569', fontWeight: '500' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 12 },
    wardCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#dbeafe'
    },
    wardText: { fontSize: 14, fontWeight: '600', color: '#1e40af', flex: 1 },

    staffGroup: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
    staffLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 12, textTransform: 'uppercase' },
    staffRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
    staffName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
    staffPhone: { fontSize: 12, color: '#64748b' },
    callBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },

    logoutBtn: {
        backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12
    },
    logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 14 }
});
