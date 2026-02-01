import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from "react-native";

export default function ToiletHelpScreen({ navigation }: any) {
    const faqs = [
        {
            q: "How do I register a new asset?",
            a: "Go to 'Register' tab. Fill ward, name, and take a photo. Tap 'Fetch Live Location' while at the site."
        },
        {
            q: "Why can't I see my Ward?",
            a: "Wards are assigned by Admin. Contact your supervisor if your assigned ward is missing."
        },
        {
            q: "App says 'Outside Area'?",
            a: "You must be within 100m of the asset location. Stand at the site and ensure GPS is on."
        },
        {
            q: "How many photos per question?",
            a: "You can take up to 3 photos. At least 1 is required for proof."
        },
        {
            q: "Session Expired?",
            a: "Tokens expire every 20 mins for security. Just log back in to continue."
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Cleanliness of Toilets FAQ</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.intro}>
                    Common questions and troubleshooting for the Toilet Cleanliness Module.
                </Text>

                {faqs.map((f, i) => (
                    <View key={i} style={styles.card}>
                        <Text style={styles.q}>Q: {f.q}</Text>
                        <Text style={styles.a}>{f.a}</Text>
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.support}>Need more help?</Text>
                    <Text style={styles.supportSub}>Contact: support@hms-portal.in</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    header: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    scroll: { padding: 20 },
    intro: { fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 20, fontWeight: '600' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    q: { fontSize: 15, fontWeight: '900', color: '#1d4ed8', marginBottom: 8 },
    a: { fontSize: 14, color: '#334155', lineHeight: 22, fontWeight: '600' },
    footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
    support: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    supportSub: { fontSize: 12, color: '#64748b', marginTop: 4 }
});
