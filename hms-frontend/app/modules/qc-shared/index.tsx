'use client';

import React from "react";

export type TableColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

type RecordsTableProps<T> = {
  rows: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  actionsLabel?: string;
  renderActions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  skeletonRows?: number;
};

export function StatsCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="card stat-card" style={{ borderLeft: `4px solid ${color || "#1d4ed8"}` }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: color || "#1f2937" }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      <style jsx>{`
        .stat-card {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 900;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 800;
          line-height: 1.2;
        }
        .stat-sub {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    APPROVED: { bg: "#dcfce7", text: "#166534" },
    REJECTED: { bg: "#fee2e2", text: "#991b1b" },
    SUBMITTED: { bg: "#dbeafe", text: "#1e40af" },
    PENDING_QC: { bg: "#fff7ed", text: "#9a3412" },
    PENDING: { bg: "#fff7ed", text: "#9a3412" },
    ACTION_REQUIRED: { bg: "#e0f2fe", text: "#075985" },
    ASSIGNED: { bg: "#ede9fe", text: "#5b21b6" },
  };
  const s = map[status] || { bg: "#f1f5f9", text: "#475569" };

  return (
    <span
      className="status-badge"
      style={{
        backgroundColor: s.bg,
        color: s.text,
      }}
    >
      {status?.replace(/_/g, " ")}
      <style jsx>{`
        .status-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 800;
          display: inline-block;
        }
      `}</style>
    </span>
  );
}

type ActionButtonsProps = {
  status: string;
  onView?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onActionRequired?: () => void;
  onAssign?: (employeeId?: string) => void;
  assignOptions?: { id: string; name?: string; email?: string }[];
  assignValue?: string;
  onAssignChange?: (val: string) => void;
  loading?: boolean;
};

export function ActionButtons({
  status,
  onView,
  onApprove,
  onReject,
  onActionRequired,
  onAssign,
  assignOptions = [],
  assignValue = "",
  onAssignChange,
  loading,
}: ActionButtonsProps) {
  const showApproval = status === "PENDING_QC" || status === "PENDING" || status === "SUBMITTED";
  const showAssign = status === "APPROVED" || status === "ASSIGNED";
  const showActionRequired = status === "SUBMITTED" || status === "PENDING_QC" || status === "PENDING";
  const allowApproval = showApproval && onApprove && onReject;
  const allowActionRequired = showActionRequired && onActionRequired;

  return (
    <div className="flex items-center justify-end gap-2">
      {onView && (
        <button className="btn btn-xs btn-outline" onClick={onView}>
          View
        </button>
      )}
      {allowApproval && (
        <>
          <button className="btn btn-xs btn-success" disabled={!!loading} onClick={onApprove}>
            {loading ? "..." : "Approve"}
          </button>
          <button className="btn btn-xs btn-error" disabled={!!loading} onClick={onReject}>
            {loading ? "..." : "Reject"}
          </button>
          {allowActionRequired && (
            <button className="btn btn-xs btn-warning" disabled={!!loading} onClick={onActionRequired}>
              {loading ? "..." : "Action Required"}
            </button>
          )}
        </>
      )}
      {showAssign && onAssign && (
        <>
          <select
            className="select select-xs select-bordered"
            value={assignValue}
            onChange={(e) => onAssignChange?.(e.target.value)}
          >
            <option value="">Select assignee</option>
            {assignOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name || emp.email || emp.id}
              </option>
            ))}
          </select>
          <button className="btn btn-xs btn-primary" disabled={!!loading} onClick={() => onAssign(assignValue)}>
            {loading ? "..." : "Assign"}
          </button>
        </>
      )}
    </div>
  );
}

export function RecordsTable<T>({
  rows,
  columns,
  loading,
  emptyMessage = "No records found",
  renderActions,
  actionsLabel = "Actions",
  onRowClick,
  skeletonRows = 6,
}: RecordsTableProps<T>) {
  return (
    <div className="table-responsive">
      <table className="modern-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === "right" ? "text-right" : ""}>
                {col.label}
              </th>
            ))}
            {renderActions && <th className="text-right">{actionsLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={col.key + cIdx}>
                      <div className="skeleton-line" />
                    </td>
                  ))}
                  {renderActions && (
                    <td>
                      <div className="skeleton-line short" />
                    </td>
                  )}
                </tr>
              ))
            : rows.map((row, idx) => (
                <tr key={idx} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable" : undefined}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.align === "right" ? "text-right" : ""}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                  {renderActions && <td className="text-right">{renderActions(row)}</td>}
                </tr>
              ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (renderActions ? 1 : 0)} className="empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx>{`
        .table-responsive {
          overflow-x: auto;
        }
        .modern-table {
          width: 100%;
          border-collapse: collapse;
        }
        .modern-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          padding: 12px 8px;
          border-bottom: 2px solid #f1f5f9;
          white-space: nowrap;
        }
        .modern-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .modern-table tr.clickable:hover {
          background: #f8fafc;
        }
        .empty {
          text-align: center;
          padding: 24px;
          color: #94a3b8;
          font-weight: 600;
        }
        .skeleton-line {
          height: 12px;
          width: 100%;
          background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 50%, #f8fafc 100%);
          background-size: 200% 100%;
          animation: shimmer 1.2s ease-in-out infinite;
          border-radius: 6px;
        }
        .skeleton-line.short {
          width: 60%;
          margin-left: auto;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
