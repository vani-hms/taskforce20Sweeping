import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert, SafeAreaView, StatusBar } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { ToiletApi } from "../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletRegisterScreen({ navigation }: { navigation: Nav }) {
    const [form, setForm] = useState({
        zoneId: "",
        wardId: "",
        areaId: "",
        name: "",
        code: "",
        type: "COMMUNITY",
        gender: "ALL",
        latitude: "",
        longitude: "",
        address: "",
        numberOfSeats: "0",
        operatorName: "",
        photo: null as string | null
    });
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadInitialGeo = async () => {
            setGeoLoading(true);
            try {
                // Fetch all zones for the city
                const res = await ToiletApi.getZones();
                setZones(res.zones || []);
            } catch {
                setError("Failed to load geo data");
            } finally {
                setGeoLoading(false);
            }
        };
        loadInitialGeo();
    }, []);

    // Load wards when zone changes
    useEffect(() => {
        if (!form.zoneId) {
            setWards([]);
            return;
        }
        const loadWards = async () => {
            try {
                const res = await ToiletApi.getWardsByZone(form.zoneId);
                setWards(res.wards || []);
            } catch (e) { console.log(e); }
        };
        loadWards();
    }, [form.zoneId]);

    // Load areas when ward changes
    useEffect(() => {
        if (!form.wardId) {
            setAreas([]);
            return;
        }
        const loadAreas = async () => {
            try {
                const res = await ToiletApi.getAreasByWard(form.wardId);
                setAreas(res.areas || []);
            } catch (e) { console.log(e); }
        };
        loadAreas();
    }, [form.wardId]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission denied", "We need camera permission to take toilet photos.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.3,
            allowsEditing: true,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets) {
            setForm(f => ({ ...f, photo: result.assets[0].base64 || null }));
        }
    };

    const fetchLocation = async () => {
        setLocLoading(true);
        setError("");
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== "granted") {
            setError("Location permission denied");
            setLocLoading(false);
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setForm((f) => ({
                ...f,
                latitude: String(loc.coords.latitude),
                longitude: String(loc.coords.longitude)
            }));
        } catch (err: any) {
            setError(err.message || "Failed to fetch location");
        } finally {
            setLocLoading(false);
        }
    };

    const canSubmit =
        form.wardId && form.name && form.latitude && form.longitude && !loading && !locLoading;

    const update = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }));

    const submit = async () => {
        if (!canSubmit) {
            Alert.alert("Incomplete", "Please fill all required fields (Name, Ward, Location).");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await ToiletApi.requestToilet({
                ...form,
                geoNodeId: form.areaId || form.wardId, // Use Area if available, else Ward
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                numberOfSeats: parseInt(form.numberOfSeats) || 0
            });
            Alert.alert("Success", "Request submitted for QC Approval", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            setError(err.message || "Failed to submit");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backBtn}>←</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>New Toilet Request</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.sectionTitle}>LOCATION DETAILS</Text>

                <Text style={styles.label}>Select Zone</Text>
                <View style={styles.select}>
                    {zones.map((z) => (
                        <TouchableOpacity
                            key={z.id}
                            style={[styles.option, form.zoneId === z.id ? styles.optionActive : undefined]}
                            onPress={() => {
                                update("zoneId", z.id);
                                update("wardId", "");
                                update("areaId", "");
                            }}
                        >
                            <Text style={form.zoneId === z.id ? styles.optionTextActive : styles.optionText}>{z.name}</Text>
                        </TouchableOpacity>
                    ))}
                    {zones.length === 0 && <Text style={styles.emptyText}>No zones found</Text>}
                </View>

                {form.zoneId && (
                    <>
                        <Text style={styles.label}>Select Ward</Text>
                        <View style={styles.select}>
                            {wards.map((w) => (
                                <TouchableOpacity
                                    key={w.id}
                                    style={[styles.option, form.wardId === w.id ? styles.optionActive : undefined]}
                                    onPress={() => {
                                        update("wardId", w.id);
                                        update("areaId", "");
                                    }}
                                >
                                    <Text style={form.wardId === w.id ? styles.optionTextActive : styles.optionText}>{w.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                {form.wardId && areas.length > 0 && (
                    <>
                        <Text style={styles.label}>Select Area (Optional)</Text>
                        <View style={styles.select}>
                            {areas.map((a) => (
                                <TouchableOpacity
                                    key={a.id}
                                    style={[styles.option, form.areaId === a.id ? styles.optionActive : undefined]}
                                    onPress={() => update("areaId", a.id)}
                                >
                                    <Text style={form.areaId === a.id ? styles.optionTextActive : styles.optionText}>{a.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Latitude</Text>
                        <TextInput style={styles.input} value={form.latitude} editable={false} placeholder="Fetch GPS..." />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Longitude</Text>
                        <TextInput style={styles.input} value={form.longitude} editable={false} placeholder="Fetch GPS..." />
                    </View>
                </View>
                <TouchableOpacity style={styles.locBtn} onPress={fetchLocation} disabled={locLoading}>
                    {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.locBtnText}>📍 Fetch Live Location</Text>}
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>TOILET SPECIFICATIONS</Text>

                <Text style={styles.label}>Toilet Name</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={(v) => update("name", v)} placeholder="e.g. Community Toilet Ward 5" />

                <Text style={styles.label}>Type</Text>
                <View style={styles.selectRow}>
                    {["COMMUNITY", "PUBLIC"].map((val) => (
                        <TouchableOpacity
                            key={val}
                            style={[styles.option, form.type === val ? styles.optionActive : undefined]}
                            onPress={() => update("type", val)}
                        >
                            <Text style={form.type === val ? styles.optionTextActive : styles.optionText}>{val === "COMMUNITY" ? "CT" : "PT"}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Exterior Photo (Required)</Text>
                <TouchableOpacity
                    style={[styles.photoBtn, form.photo ? styles.photoBtnSuccess : undefined]}
                    onPress={pickImage}
                >
                    <Text style={styles.photoBtnText}>
                        {form.photo ? "✅ Photo Captured" : "📷 Take Exterior Photo"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Gender</Text>
                <View style={styles.selectRow}>
                    {["MALE", "FEMALE", "ALL", "DISABLED"].map((val) => (
                        <TouchableOpacity
                            key={val}
                            style={[styles.option, form.gender === val ? styles.optionActive : undefined]}
                            onPress={() => update("gender", val)}
                        >
                            <Text style={form.gender === val ? styles.optionTextActive : styles.optionText}>{val}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Seats</Text>
                        <TextInput style={styles.input} value={form.numberOfSeats} onChangeText={(v) => update("numberOfSeats", v)} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Toilet Code (Optional)</Text>
                        <TextInput style={styles.input} value={form.code} onChangeText={(v) => update("code", v)} />
                    </View>
                </View>

                <Text style={styles.label}>Address / Landmark</Text>
                <TextInput style={styles.input} value={form.address} onChangeText={(v) => update("address", v)} multiline />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={[styles.submitBtn, !canSubmit ? { opacity: 0.5 } : undefined]} disabled={!canSubmit} onPress={submit}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Registration</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    container: { padding: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginTop: 24, marginBottom: 15, letterSpacing: 1.5 },
    label: { fontSize: 12, fontWeight: '800', color: '#64748b', marginTop: 12 },
    input: { backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginTop: 8, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    locBtn: { marginTop: 12, backgroundColor: "#0ea5e9", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    locBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
    submitBtn: { marginTop: 32, backgroundColor: "#1d4ed8", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
    submitBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
    row: { flexDirection: "row", gap: 12 },
    select: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff" },
    optionActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
    optionText: { color: "#64748b", fontWeight: '700', fontSize: 12 },
    optionTextActive: { color: "#fff", fontWeight: "900", fontSize: 12 },
    error: { color: "#dc2626", marginTop: 15, fontWeight: '800', textAlign: 'center' },
    emptyText: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    photoBtn: { marginTop: 12, backgroundColor: "#f8fafc", paddingVertical: 14, borderRadius: 12, alignItems: "center", borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0' },
    photoBtnSuccess: { backgroundColor: "#dcfce7", borderColor: "#10b981", borderStyle: 'solid' },
    photoBtnText: { color: "#1e293b", fontWeight: "800", fontSize: 13 },
});
