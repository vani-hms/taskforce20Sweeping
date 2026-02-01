import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { listTwinbinApproved, ApiError } from "../../../api/auth";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthContext } from "../../../auth/AuthProvider";
import { Colors, Spacing, Typography, Layout } from "../../../theme";
import { MapPin, Tag, CheckCircle } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcApproved">;

export default function TwinbinQcApprovedScreen({ navigation }: Props) {
    const [bins, setBins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { auth } = useAuthContext();
    const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            // Fetch all records from generic endpoint
            const res = await listTwinbinApproved();
            // Filter for BINS that are APPROVED
            const approvedBins = (res.records || []).filter(
                (r) => r.type === "BIN_REGISTRATION" && r.status === "APPROVED"
            );
            setBins(approvedBins);
        } catch (err: any) {
            setError(err instanceof ApiError ? err.message : "Failed to load approved bins");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    const onRefresh = () => load();

    if (loading && !bins.length) {
        return (
            <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={Layout.screenContainer}>
            {error ? (
                <View style={styles.errorBox}>
                    <Text style={{ color: Colors.danger }}>{error}</Text>
                </View>
            ) : null}

            <FlatList
                data={bins}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: Spacing.xl }}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={Typography.h3}>No approved bins</Text>
                            <Text style={Typography.body}>Review pending requests first.</Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[Layout.card, { marginBottom: Spacing.m }]}
                        onPress={() => navigation.navigate("TwinbinQcAssign", { bin: item })}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                            <Text style={Typography.h3}>{item.areaName}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={14} color={Colors.success} />
                                <Text style={[Typography.caption, { color: Colors.success, fontWeight: "700" }]}>APPROVED</Text>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <MapPin size={14} color={Colors.textMuted} />
                            <Text style={Typography.caption}>{item.locationName}</Text>
                        </View>

                        <View style={styles.row}>
                            <Tag size={14} color={Colors.textMuted} />
                            <Text style={Typography.caption}>
                                Z: {item.zoneName || "-"} / W: {item.wardName || "-"}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    errorBox: {
        backgroundColor: Colors.dangerBg,
        padding: Spacing.m,
        borderRadius: 8,
        marginBottom: Spacing.m
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: "center"
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2
    }
});
