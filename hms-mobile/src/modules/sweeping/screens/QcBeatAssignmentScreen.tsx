import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet
} from "react-native";

import { listEmployees } from "../../../api/employees";
import { listSweepingBeats, assignSweepingBeat } from "../../../api/auth";


export default function QcBeatAssignmentScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const e = await listEmployees("SWEEPING");
    const b = await listSweepingBeats();

    setEmployees(e.employees || []);
    setBeats(b.beats || []);
  };

  const assign = async (beatId: string) => {
    if (!selectedEmp) return alert("Please select employee");

    await assignSweepingBeat({
      sweepingBeatId: beatId,
      employeeId: selectedEmp.id
    });

    alert("Beat Assigned");
    load();
  };

  return (
    <View style={styles.container}>

      {/* Employee Picker */}

      <Text style={styles.section}>Select Employee</Text>

      <View style={styles.employeeRow}>
        {employees.map(e => (
          <TouchableOpacity
            key={e.id}
            onPress={() => setSelectedEmp(e)}
            style={[
              styles.employeeChip,
              selectedEmp?.id === e.id && styles.employeeActive
            ]}
          >
            <Text style={{
              color: selectedEmp?.id === e.id ? "#fff" : "#000",
              fontWeight: "600"
            }}>
              {e.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Beats */}

      <Text style={styles.section}>Sweeping Beats</Text>

      <FlatList
        data={beats}
        keyExtractor={b => b.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.beatCard}
            onPress={() => assign(item.id)}
          >
            <View>
              <Text style={styles.beatName}>
                {item.geoNodeBeat?.name}
              </Text>

              <Text style={styles.status}>
                {item.assignedEmployeeId ? "Assigned" : "Unassigned"}
              </Text>
            </View>

            <View style={[
              styles.badge,
              { backgroundColor: item.assignedEmployeeId ? "#dcfce7" : "#fee2e2" }
            ]}>
              <Text style={{
                color: item.assignedEmployeeId ? "#166534" : "#991b1b",
                fontWeight: "700"
              }}>
                {item.assignedEmployeeId ? "ASSIGNED" : "OPEN"}
              </Text>
            </View>

          </TouchableOpacity>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },

  section: {
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 8
  },

  employeeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },

  employeeChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: "#f8fafc"
  },

  employeeActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb"
  },

  beatCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  beatName: {
    fontWeight: "700"
  },

  status: {
    color: "#64748b",
    marginTop: 2
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  }
});
