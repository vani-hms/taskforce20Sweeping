import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { listEmployees } from "../../../api/employees";
import { listQcSweepingBeats, assignSweepingBeatQc } from "../../../api/auth";

export default function QcBeatAssignmentScreen() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const e = await listEmployees("SWEEPING");
    const b = await listQcSweepingBeats();

    setEmployees(e.employees);
    setBeats(b.beats);
  };

  const assign = async (beatId: string) => {
    if (!selectedEmp) return alert("Select employee first");

    await assignSweepingBeatQc({
      sweepingBeatId: beatId,
      employeeId: selectedEmp.id
    });

    alert("Assigned");
    load();
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Select Employee</Text>

      {employees.map((e) => (
        <TouchableOpacity key={e.id} onPress={() => setSelectedEmp(e)}>
          <Text style={{ padding: 6, backgroundColor: selectedEmp?.id === e.id ? "#bfdbfe" : "#eee" }}>
            {e.name}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={{ marginTop: 16 }}>Beats</Text>

      <FlatList
        data={beats}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ padding: 10, borderBottomWidth: 1 }}
            onPress={() => assign(item.id)}
          >
            <Text>{item.geoNodeBeat.name}</Text>
            <Text>{item.assignedEmployeeId ? "Assigned" : "Unassigned"}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
