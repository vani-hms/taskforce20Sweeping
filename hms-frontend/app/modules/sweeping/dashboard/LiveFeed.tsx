export default function LiveFeed({ feed, alerts }: any) {
  return (
    <div className="grid grid-2">

      {/* LIVE INSPECTIONS */}
      <div className="card">
        <div className="flex-between">
          <b>🚨 Live Inspections</b>
          <span className="live-dot" />
        </div>

        <div className="space-y-2 mt-3 max-h-80 overflow-auto">

          {feed.map((l: any) => (
            <div
              key={l.id}
              className="flex gap-3 p-3 rounded-xl bg-blue-50 items-center"
            >

              {/* Avatar */}
              <div className="avatar">
                {l.employee?.name?.[0] || "?"}
              </div>

              {/* Info */}
              <div className="flex-1">

                <div className="font-semibold text-sm">
                  {l.sweepingBeat.geoNodeBeat.name}
                </div>

                <div className="text-xs muted">
                  {l.employee?.name}
                </div>

              </div>

              {/* Status */}
              <span className={`badge ${
                l.status === "APPROVED"
                  ? "badge-success"
                  : l.status === "ACTION_REQUIRED"
                  ? "badge-warn"
                  : ""
              }`}>
                {l.status}
              </span>

            </div>
          ))}

        </div>
      </div>

      {/* WARD ALERTS */}
      <div className="card">
        <b>⚠ Ward Alerts</b>

        <div className="space-y-2 mt-3">

          {alerts.map((a: any, i: number) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 rounded-xl bg-red-50"
            >

              <div className="font-medium text-sm">
                {a.wardName}
              </div>

              <span className="badge-error">
                {a.pending} Pending
              </span>

            </div>
          ))}

        </div>
      </div>

    </div>
  );
}
