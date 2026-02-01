import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../navigation";
import { assignTwinbinBin, ApiError, listGeo } from "../../../api/auth";
import { listEmployees } from "../../../api/employees";
import { useAuthContext } from "../../../auth/AuthProvider";
import { Colors, Spacing, Typography, Layout, UI } from "../../../theme";
import { Map, CheckSquare, Square, UserCheck, AlertTriangle } from "lucide-react-native";

type Props = NativeStackScreenProps<RootStackParamList, "TwinbinQcAssign">;

export default function TwinbinQcAssignScreen({ route, navigation }: Props) {
    const { bin } = route.params;
    const [assignIds, setAssignIds] = useState<Set<string>>(new Set(bin.assignedEmployeeIds || []));
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");
    const [zoneMap, setZoneMap] = useState<Record<string, string>>({});
    const { auth } = useAuthContext();
    const isQc = auth.status === "authenticated" && (auth.roles || []).includes("QC");

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [empRes, zonesRes] = await Promise.all([
                listEmployees("LITTERBINS").catch(() => ({ employees: [] })),
                listGeo("ZONE").catch(() => ({ nodes: [] })),
            ]);
            const onlyEmployees = (empRes.employees || []).filter((e) => e.role === "EMPLOYEE");
            setEmployees(onlyEmployees);
            setZoneMap(Object.fromEntries((zonesRes.nodes || []).map((n: any) => [n.id, n.name])));
        } catch (err: any) {
            setError(err instanceof ApiError ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const toggleAssign = (id: string) => {
        setAssignIds((prev) => {
            // Single assignment for now to keep it simple, or multi? 
            // Backend supports array. Let's support single select mostly but array is fine.
            // UI flow usually implies single primary assignee or multiple? 
            // Let's stick to set toggle (multiple).
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                // Optional: clear others if single assign preferred.
                next.clear();
                next.add(id);
            }
            return next;
        });
    };

    const assign = async () => {
        if (assignIds.size === 0) {
            setError("Select an employee to assign.");
            return;
        }
        setActionLoading(true);
        setError("");
        try {
            await assignTwinbinBin(bin.id, { assignedEmployeeIds: Array.from(assignIds) });
            Alert.alert("Assigned", "Employee successfully assigned to bin.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } catch (err: any) {
            setError(err instanceof ApiError ? err.message : "Failed to assign");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter logic: Match zone name if available
    const filteredEmployees = employees.filter(e => {
        if (bin.zoneName) {
            // EmployeesApi returns 'zones' as names
            return e.zones?.includes(bin.zoneName);
        }
        // Fallback if no zoneName in bin (should be there for approved/generic records)
        return true;
    });

    if (loading) {
        return (
            <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={Layout.screenContainer} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
            <Text style={[Typography.h2, { marginBottom: Spacing.m, color: Colors.primary }]}>Assign Employee</Text>

            <View style={Layout.card}>
                <Text style={[Typography.h3, { marginBottom: 4 }]}>{bin.areaName}</Text>
                <Text style={[Typography.body, { color: Colors.textMuted, marginBottom: Spacing.s }]}>{bin.locationName}</Text>
                <View style={{ flexDirection: "row", gap: Spacing.m }}>
                    <Text style={Typography.caption}>Zone: {bin.zoneName || "-"}</Text>
                    <Text style={Typography.caption}>Ward: {bin.wardName || "-"}</Text>
                </View>
            </View>

            <Text style={[Typography.h3, { marginTop: Spacing.l, marginBottom: Spacing.s }]}>Select Employee</Text>

            {filteredEmployees.length === 0 ? (
                <View style={[Layout.card, { alignItems: 'center', padding: Spacing.l }]}>
                    <AlertTriangle size={32} color={Colors.warning} />
                    <Text style={[Typography.body, { marginTop: Spacing.m, textAlign: 'center' }]}>
                        No employees found for this zone.
                    </Text>
                </View>
            ) : (
                <View style={Layout.card}>
                    {filteredEmployees.map((emp) => (
                        <TouchableOpacity key={emp.id} style={styles.assignRow} onPress={() => toggleAssign(emp.id)}>
                            {assignIds.has(emp.id) ? (
                                <CheckSquare size={20} color={Colors.primary} />
                            ) : (
                                <Square size={20} color={Colors.textMuted} />
                            )}
                            <View>
                                <Text style={Typography.body}>{emp.name}</Text>
                                <Text style={Typography.caption}>{emp.email}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {error ? <Text style={[Typography.body, { color: Colors.danger, marginTop: Spacing.m }]}>{error}</Text> : null}

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[
                        UI.button,
                        { backgroundColor: assignIds.size === 0 ? Colors.border : Colors.primary, flex: 1, marginTop: Spacing.m }
                    ]}
                    onPress={assign}
                    disabled={actionLoading || assignIds.size === 0}
                >
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {actionLoading ? <ActivityIndicator color={Colors.white} /> : <UserCheck size={18} color={Colors.white} />}
                        <Text style={{ color: Colors.white, fontWeight: "600" }}>
                            {actionLoading ? "Assigning..." : "Confirm Assignment"}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    assignRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomColor: Colors.border,
        borderBottomWidth: 1,
        gap: Spacing.m
    },
    actions: { flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.l }
});
