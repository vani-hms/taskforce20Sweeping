'use client';

import { ModuleGuard, Protected } from "@components/Guards";
import QCDashboard from "../components/QCDashboard";

export default function LitterbinsQcPage() {
  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["QC", "CITY_ADMIN", "ULB_OFFICER"]}>
        <QCDashboard />
      </ModuleGuard>
    </Protected>
  );
}
