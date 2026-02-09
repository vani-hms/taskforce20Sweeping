"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";

export default function SweepingCharts() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const res: any = await SweepingApi.dashboardWardLeaderboard();
      setData(res.leaderboard || []);
    }

    load();
  }, []);

  return (
    <div className="card">
      <h3>Top Wards</h3>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 6)}>
            <XAxis hide />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
