import React, { useEffect, useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator,
    StyleSheet, ScrollView, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Image, StatusBar
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { ToiletApi } from "../../../api/modules";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation/types";
import { useAuthContext } from "../../../auth/AuthProvider";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ToiletRegisterScreen({ navigation }: { navigation: Nav }) {
    const { auth } = useAuthContext();
    const cityName = auth.status === 'authenticated' ? auth.cityName : "Unknown City";

    const [form, setForm] = useState({
        zoneId: "",
        wardId: "",
        name: "",
        type: "CT",
        gender: "UNISEX",
        code: "",
        address: "",
        numberOfSeats: "",
        latitude: "",
        longitude: "",
        photo: null as string | null
    });

    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [loadingGeo, setLoadingGeo] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [locLoading, setLocLoading] = useState(false);

    useEffect(() => {
        loadZones();
    }, []);

    const loadZones = async () => {
        setLoadingGeo(true);
        try {
            const res = await ToiletApi.getZones();
            setZones(res.zones || []);
            if (res.zones && res.zones.length > 0 && !form.zoneId) {
                setForm(f => ({ ...f, zoneId: res.zones[0].id }));
            }
        } catch (e) {
            console.log("Failed to load zones", e);
        } finally {
            setLoadingGeo(false);
        }
    };

    useEffect(() => {
        if (!form.zoneId) {
            setWards([]);
            return;
        }
        loadWards(form.zoneId);
    }, [form.zoneId]);

    const loadWards = async (zoneId: string) => {
        setLoadingWards(true);
        try {
            const res = await ToiletApi.getWardsByZone(zoneId);
            setWards(res.wards || []);
            if (res.wards && res.wards.length > 0) {
                setForm(f => ({ ...f, wardId: res.wards[0].id }));
            } else {
                setForm(f => ({ ...f, wardId: "" }));
            }
        } catch (e) { console.log(e); } finally {
            setLoadingWards(false);
        }
    };

    const fetchLocation = async () => {
        setLocLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied');
            setLocLoading(false);
            return;
        }

        try {
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setForm(f => ({
                ...f,
                latitude: location.coords.latitude.toString(),
                longitude: location.coords.longitude.toString()
            }));
        } catch (e) {
            Alert.alert("Error", "Could not fetch location");
        } finally {
            setLocLoading(false);
        }
    };

    const pickImage = async () => {
        Alert.alert(
            "Upload Photo",
            "Choose a source",
            [
                { text: "Take Photo", onPress: launchCamera },
                { text: "Choose from Gallery", onPress: launchGallery },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const launchCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission denied", "Camera permission is required.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            base64: true, quality: 0.3, allowsEditing: false
        });
        if (!result.canceled && result.assets) {
            setForm(f => ({ ...f, photo: result.assets[0].base64 || null }));
        }
    };

    const launchGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission denied", "Gallery permission is required.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            base64: true, quality: 0.3, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images
        });
        if (!result.canceled && result.assets) {
            setForm(f => ({ ...f, photo: result.assets[0].base64 || null }));
        }
    };

    const handleSubmit = async () => {
        if (!form.wardId || !form.name || !form.latitude || !form.longitude) {
            Alert.alert("Validation Error", "Please fill required fields (Ward, Name, Location).");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name,
                type: form.type,
                gender: form.gender,
                wardId: form.wardId,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                address: form.address,
                code: form.code,
                numberOfSeats: form.numberOfSeats ? parseInt(form.numberOfSeats) : 0,
            };

            await ToiletApi.requestToilet(payload);

            Alert.alert("Success", "Toilet Request Submitted!");
            setForm(f => ({ ...f, name: "", code: "", address: "", photo: null, latitude: "", longitude: "" }));
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Toilet Registration</Text>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Location Hierarchy</Text>
                        <Text style={styles.label}>Zone</Text>
                        <View style={styles.pickerContainer}>
                            {loadingGeo ? <ActivityIndicator /> : (
                                <Picker
                                    selectedValue={form.zoneId}
                                    onValueChange={(v) => setForm(f => ({ ...f, zoneId: v }))}
                                    enabled={zones.length > 1}
                                >
                                    {zones.length === 0 && <Picker.Item label="No Zones Found" value="" />}
                                    {zones.map(z => <Picker.Item key={z.id} label={z.name} value={z.id} />)}
                                </Picker>
                            )}
                        </View>

                        <Text style={styles.label}>Ward</Text>
                        <View style={styles.pickerContainer}>
                            {loadingWards ? <ActivityIndicator /> : (
                                <Picker
                                    selectedValue={form.wardId}
                                    onValueChange={(v) => setForm(f => ({ ...f, wardId: v }))}
                                >
                                    {wards.length === 0 && <Picker.Item label={form.zoneId ? "No Wards Found" : "Select Zone First"} value="" />}
                                    {wards.map(w => <Picker.Item key={w.id} label={w.name} value={w.id} />)}
                                </Picker>
                            )}
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Technical Details</Text>
                        <Text style={styles.label}>Toilet Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sulabh Complex Market A"
                            value={form.name}
                            onChangeText={t => setForm(f => ({ ...f, name: t }))}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Type</Text>
                                <View style={styles.pickerContainerSmall}>
                                    <Picker
                                        selectedValue={form.type}
                                        onValueChange={v => setForm(f => ({ ...f, type: v }))}
                                    >
                                        <Picker.Item label="Community (CT)" value="CT" />
                                        <Picker.Item label="Public (PT)" value="PT" />
                                        <Picker.Item label="Urinals" value="URINALS" />
                                    </Picker>
                                </View>
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Target</Text>
                                <View style={styles.pickerContainerSmall}>
                                    <Picker
                                        selectedValue={form.gender}
                                        onValueChange={v => setForm(f => ({ ...f, gender: v }))}
                                    >
                                        <Picker.Item label="Unisex" value="UNISEX" />
                                        <Picker.Item label="Male" value="MALE" />
                                        <Picker.Item label="Female" value="FEMALE" />
                                        <Picker.Item label="Differently Abled" value="DIFFERENTLY_ABLED" />
                                    </Picker>
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>No. of Seats</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    value={form.numberOfSeats}
                                    onChangeText={t => setForm(f => ({ ...f, numberOfSeats: t }))}
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Code (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Unique Code"
                                    value={form.code}
                                    onChangeText={t => setForm(f => ({ ...f, code: t }))}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Address & Location</Text>
                        <Text style={styles.label}>Address / Landmark</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            placeholder="Full address details..."
                            multiline
                            numberOfLines={2}
                            value={form.address}
                            onChangeText={t => setForm(f => ({ ...f, address: t }))}
                        />

                        <Text style={styles.label}>Geo-Coordinates</Text>
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Latitude"
                                value={form.latitude}
                                onChangeText={t => setForm(f => ({ ...f, latitude: t }))}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                placeholder="Longitude"
                                value={form.longitude}
                                onChangeText={t => setForm(f => ({ ...f, longitude: t }))}
                                keyboardType="numeric"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, styles.geoButton]}
                            onPress={fetchLocation}
                            disabled={locLoading}
                        >
                            {locLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>FETCH LIVE LOCATION</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Exterior Photo (Optional)</Text>

                        <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
                            {form.photo ? (
                                <Image source={{ uri: 'data:image/jpeg;base64,' + form.photo }} style={styles.photoPreview} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 32 }}>📷</Text>
                                    <Text style={{ color: '#64748b', marginTop: 8 }}>Tap to Capture</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>SUBMIT REQUEST</Text>}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f1f5f9' },
    // Header Fix with explicitly large padding for Android
    header: {
        height: Platform.OS === 'android' ? 100 : 70, // Explicitly tall
        paddingTop: Platform.OS === 'android' ? 50 : 10, // Explicit padding
        backgroundColor: '#fff',
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    content: { padding: 16, paddingBottom: 60 },

    sectionCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2
    },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#334155', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6 },
    input: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 16
    },
    readOnlyInput: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
    readOnlyText: { color: '#475569', fontWeight: '600' },
    pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 16 },
    pickerContainerSmall: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 16 },
    row: { flexDirection: 'row' },
    actionButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    geoButton: { backgroundColor: '#3b82f6' },
    actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    photoBox: { height: 150, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    photoPreview: { width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover' },
    submitButton: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, elevation: 3 },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
