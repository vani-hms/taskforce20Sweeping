import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from "recharts";

const COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

export default function ChartsSection({ data }: any) {

  const donut = [
    { name: "Approved", value: data.summary.approvedToday },
    { name: "Inspected", value: data.summary.inspectedToday },
    { name: "Action", value: data.summary.actionRequired }
  ];

  return (
    <div className="grid grid-2">

      {/* DONUT */}
      <div className="card">

        <div className="flex-between mb-2">
          <b>Approval Ratio</b>

          <div className="flex gap-2 text-xs">
            <span className="badge-success">Approved</span>
            <span className="badge">Inspected</span>
            <span className="badge-warn">Action</span>
          </div>
        </div>

        <div className="chart-card" style={{ position: "relative" }}>

          <ResponsiveContainer>
            <PieChart>

              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>

                <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>

              <Pie
                data={donut}
                innerRadius={70}
                outerRadius={100}
                dataKey="value"
                paddingAngle={4}
              >
                <Cell fill="url(#g1)" />
                <Cell fill="url(#g2)" />
                <Cell fill="url(#g3)" />
              </Pie>

              <Tooltip />

            </PieChart>
          </ResponsiveContainer>

          <div className="donut-center">
            {data.summary.coveragePercent}%
          </div>
        </div>

      </div>

      {/* BAR */}
      <div className="card">

        <b>Ward Completion</b>

        <div className="chart-card">

          <ResponsiveContainer>
            <BarChart data={data.wardStats}>

              <defs>
                <linearGradient id="wardGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#93c5fd" />
                </linearGradient>
              </defs>

              <XAxis dataKey="wardName" />
              <YAxis />
              <Tooltip />

              <Bar
                dataKey="completionPercent"
                radius={[10, 10, 0, 0]}
                fill="url(#wardGradient)"
              >
                <LabelList
                  dataKey="completionPercent"
                  position="top"
                  formatter={(v:any)=>`${v}%`}
                />
              </Bar>

            </BarChart>
          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}
