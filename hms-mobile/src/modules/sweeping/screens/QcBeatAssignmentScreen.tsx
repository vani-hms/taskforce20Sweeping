import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import { listEmployees } from "../../../api/employees";
import { listQcSweepingBeats, assignSweepingBeatQc } from "../../../api/auth";
import { Layout, Typography } from "../../../theme";

export default function QcBeatAssignmentScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const e = await listEmployees("SWEEPING");
      const b = await listQcSweepingBeats();

      setEmployees(e.employees || []);
      setBeats(b.beats || []);
    } catch {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const assign = async (beat: any) => {
    if (!selectedEmp) return Alert.alert("Select Employee");

    if (beat.assignedEmployeeId)
      return Alert.alert("Already Assigned");

    Alert.alert(
      "Confirm Assignment",
      `Assign this beat to ${selectedEmp.name}?`,
      [
        { text: "Cancel" },
        {
          text: "Assign",
          onPress: async () => {
            await assignSweepingBeatQc({
              sweepingBeatId: beat.id,
              employeeId: selectedEmp.id
            });

            Alert.alert("Success", "Beat assigned");
            load();
          }
        }
      ]
    );
  };

  if (loading)
    return (
      <View style={[Layout.screenContainer, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={Layout.screenContainer}>
      <Text style={Typography.h2}>Assign Beats</Text>

      {/* EMPLOYEES */}
      <Text style={{ marginTop: 10, marginBottom: 6 }}>Select Employee</Text>

      <FlatList
        horizontal
        data={employees}
        keyExtractor={e => e.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedEmp(item)}
            style={{
              padding: 10,
              marginRight: 8,
              borderRadius: 10,
              backgroundColor:
                selectedEmp?.id === item.id ? "#dbeafe" : "#f1f5f9"
            }}
          >
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {!selectedEmp && (
        <Text style={{ color: "#ef4444", marginTop: 6 }}>
          Please select employee
        </Text>
      )}

      {/* BEATS */}
      <Text style={{ marginTop: 20, marginBottom: 6 }}>Beats</Text>

      <FlatList
        data={beats}
        keyExtractor={b => b.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={!!item.assignedEmployeeId}
            onPress={() => assign(item)}
            style={[
              Layout.card,
              {
                marginVertical: 6,
                opacity: item.assignedEmployeeId ? 0.5 : 1
              }
            ]}
          >
            <Text style={{ fontWeight: "600" }}>
              {item.geoNodeBeat?.name || "Beat"}
            </Text>

            <View
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                backgroundColor: item.assignedEmployeeId
                  ? "#dcfce7"
                  : "#fde68a",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8
              }}
            >
              <Text style={{ fontSize: 12 }}>
                {item.assignedEmployeeId ? "Assigned" : "Unassigned"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
