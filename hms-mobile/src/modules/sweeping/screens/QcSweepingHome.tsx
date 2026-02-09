import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";

import {
  listSweepingQcInspections,
  sweepingDashboardSummary,
} from "../../../api/auth";

type Tab = "pending" | "action" | "history";

export default function QcSweepingHome() {
  const navigation = useNavigation<any>();

  const [tab, setTab] = useState<Tab>("pending");
  const [summary, setSummary] = useState<any>({});
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const s = await sweepingDashboardSummary();
    setSummary(s);

    const r = await listSweepingQcInspections();
    setList(r.inspections || []);
  };

  const filtered = list.filter(i => {
    if (tab === "pending") return i.status === "REVIEW_PENDING";
    if (tab === "action") return i.status === "ACTION_REQUIRED";
    return true;
  });

  return (
    <ScrollView style={{ padding: 16 }}>

      {/* KPIs */}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Kpi title="Pending" value={summary.pendingQc} />
        <Kpi title="Action" value={summary.actionRequired} />
        <Kpi title="Approved" value={summary.approvedToday} />
      </View>

      {/* Tabs */}

      <View style={{ flexDirection: "row", marginTop: 16 }}>
        {["pending", "action", "history"].map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t as Tab)}
            style={{
              padding: 10,
              borderRadius: 8,
              marginRight: 6,
              backgroundColor: tab === t ? "#2563eb" : "#e5e7eb"
            }}
          >
            <Text style={{ color: tab === t ? "white" : "#000" }}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inspections */}

      {filtered.map(item => (
        <TouchableOpacity
          key={item.id}
          onPress={() =>
            navigation.navigate("QcSweepingDetail", { inspection: item })
          }
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 12,
            marginTop: 12
          }}
        >
          <Text style={{ fontWeight: "700" }}>
            {item.employee?.name}
          </Text>

          <Text>
            {item.sweepingBeat?.geoNodeBeat?.name}
          </Text>

          <Text>{item.status}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={{
          backgroundColor: "#2563eb",
          padding: 12,
          borderRadius: 10,
          marginTop: 16
        }}
        onPress={() => navigation.navigate("QcBeatAssignment")}
      >
        <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
          Assign Beats
        </Text>
      </TouchableOpacity>


    </ScrollView>
  );
}

function Kpi({ title, value }: any) {
  return (
    <View style={{ borderWidth: 1, padding: 12, borderRadius: 10, width: "30%" }}>
      <Text style={{ fontSize: 12 }}>{title}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>{value || 0}</Text>
    </View>
  );
}
