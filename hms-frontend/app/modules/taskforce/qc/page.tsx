'use client';

import Link from "next/link";
import { ModuleGuard, Protected } from "@components/Guards";

export default function TaskforceQcHomePage() {
  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["QC"]}>
        <div className="page">
          <h1>Taskforce – QC</h1>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div className="card">
              <h3>Pending Reports</h3>
              <p className="muted">Review feeder point reports submitted by employees.</p>
              <Link className="btn btn-primary btn-sm" href="/modules/taskforce/qc/reports">
                Open Reports
              </Link>
            </div>
            <div className="card muted">
              <h3>Notes</h3>
              <p>Use the reports queue to approve, reject, or mark action required.</p>
            </div>
          </div>
        </div>
      </ModuleGuard>
    </Protected>
  );
}
