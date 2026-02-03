export default function KpiCards({ summary, qc, ao }: any) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: "14px"
      }}
    >

      <Kpi color="blue" icon="🧭" label="Total Beats" value={summary.totalBeats} />
      <Kpi color="green" icon="✅" label="Approved" value={summary.approvedToday} />
      <Kpi color="orange" icon="📋" label="Inspected" value={summary.inspectedToday} />
      <Kpi color="red" icon="⚠️" label="Action Required" value={summary.actionRequired} />

      <Kpi color="blue" icon="📊" label="Coverage" value={`${summary.coveragePercent}%`} />
      <Kpi color="green" icon="🕵️" label="QC Reviewed" value={qc.reviewedToday} />
      <Kpi color="orange" icon="🛠" label="AO Resolved" value={ao.resolvedToday} />
      <Kpi color="blue" icon="📸" label="Photos" value={summary.photosToday} />

    </div>
  );
}

/* MINI KPI COMPONENT */
function Kpi({ icon, label, value, color }: any) {
  return (
    <div className={`kpi ${color}`}>

      <div className="flex-between">

        <div className="kpi-value">
          {value}
        </div>

        <div style={{ opacity:.8 }}>
          {icon}
        </div>

      </div>

      <div className="kpi-label mt-1">
        {label}
      </div>

    </div>
  );
}
