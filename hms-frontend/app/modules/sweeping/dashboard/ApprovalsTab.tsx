'use client';

import { useEffect, useState } from "react";
import { SweepingApi } from "@lib/apiClient";

export default function ApprovalsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res: any = await SweepingApi.approvalInbox();
    setItems(res.items || []);
    setLoading(false);
  };

  const handleAction = async (id: string, status: string) => {
    await SweepingApi.reviewInspection(id, { status, comment });
    alert("Action completed");
    setSelected(null);
    setComment("");
    load();
  };

  if (loading) return <div className="p-6 skeleton h-40 rounded-xl" />;

  return (
    <div className="grid grid-cols-2 gap-6">

      {/* LEFT INBOX */}
      <div className="card">

        <div className="flex-between mb-3">
          <b>📥 Verification Inbox</b>
          <span className="badge">{items.length} Items</span>
        </div>

        <div className="space-y-2 max-h-[520px] overflow-auto">

          {items.map(i => (
            <div
              key={i.id}
              onClick={() => setSelected(i)}
              className={`flex gap-3 p-3 rounded-xl cursor-pointer border ${
                selected?.id === i.id
                  ? "bg-blue-50 border-blue-300"
                  : "hover:bg-slate-50"
              }`}
            >

              <div className="avatar">
                {i.employee?.name?.[0] || "?"}
              </div>

              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {i.sweepingBeat.geoNodeBeat.name}
                </div>

                <div className="text-xs muted">
                  {i.employee?.name}
                </div>
              </div>

              <Status status={i.status} />

            </div>
          ))}

          {items.length === 0 && (
            <div className="text-sm muted mt-4">No pending items</div>
          )}

        </div>
      </div>

      {/* RIGHT DETAIL */}
      {selected && (
        <div className="card">

          <div className="flex-between mb-3">
            <b>📝 Inspection Detail</b>
            <Status status={selected.status} />
          </div>

          <div className="space-y-2 text-sm">

            <div><b>Beat:</b> {selected.sweepingBeat.geoNodeBeat.name}</div>
            <div><b>Employee:</b> {selected.employee?.name}</div>

          </div>

          {/* Answers */}
          <div className="mt-4 space-y-2">

            {Object.entries(selected.answers || {}).map(([k, v]: any) => (
              <div key={k} className="flex justify-between border-b py-1 text-sm">
                <span>{k}</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}

          </div>

          {/* Comment */}
          {selected.status !== "APPROVED" && (
            <textarea
              className="textarea w-full mt-4"
              placeholder="Add comment (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-6">

            {selected.status === "SUBMITTED" && (
              <>
                <button className="btn btn-primary" onClick={() => handleAction(selected.id, "APPROVED")}>
                  Approve
                </button>

                <button className="btn btn-secondary" onClick={() => handleAction(selected.id, "REJECTED")}>
                  Reject
                </button>

                <button className="btn btn-outline" onClick={() => handleAction(selected.id, "ACTION_REQUIRED")}>
                  Action Required
                </button>
              </>
            )}

            {selected.status === "ACTION_REQUIRED" && (
              <>
                <button className="btn btn-primary" onClick={() => handleAction(selected.id, "APPROVED")}>
                  Resolve
                </button>

                <button className="btn btn-secondary" onClick={() => handleAction(selected.id, "REJECTED")}>
                  Reject
                </button>
              </>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

/* STATUS PILL */
function Status({ status }: any) {
  const map: any = {
    APPROVED: "badge-success",
    REJECTED: "badge-error",
    SUBMITTED: "badge",
    ACTION_REQUIRED: "badge-warn"
  };

  return (
    <span className={map[status]}>
      {status}
    </span>
  );
}
