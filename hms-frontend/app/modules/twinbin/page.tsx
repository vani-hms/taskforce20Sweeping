'use client';

import Link from "next/link";
import { Protected, ModuleGuard } from "@components/Guards";

export default function TwinbinEmployeeHome() {
  return (
    <Protected>
      <ModuleGuard module="TWINBIN" roles={["EMPLOYEE", "CITY_ADMIN", "QC", "ACTION_OFFICER", "HMS_SUPER_ADMIN"]}>
        <div className="page">
          <h1>Twinbin - Employee</h1>
          <div className="grid grid-2">
            <div className="card card-hover">
              <h3>Register Litter Bin</h3>
              <p className="muted">Submit a new twinbin installation request with location and condition.</p>
              <Link className="btn btn-primary btn-sm" href="/modules/twinbin/register">
                Open
              </Link>
            </div>
            <div className="card card-hover">
              <h3>My Bin Requests</h3>
              <p className="muted">View the status of your submitted twinbin requests.</p>
              <Link className="btn btn-primary btn-sm" href="/modules/twinbin/my-requests">
                Open
              </Link>
            </div>
            <div className="card card-hover">
              <h3>Assigned Bins</h3>
              <p className="muted">See bins assigned to you and check distance before reporting.</p>
              <Link className="btn btn-primary btn-sm" href="/modules/twinbin/assigned">
                Open
              </Link>
            </div>
          </div>
        </div>
      </ModuleGuard>
    </Protected>
  );
}

