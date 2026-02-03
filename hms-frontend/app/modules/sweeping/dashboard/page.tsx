'use client';

import { useState } from "react";
import { ModuleGuard } from "@components/Guards";

import AdminDashboard from "./AdminDashboard";
import ReportsTab from "./ReportsTab";
import ApprovalsTab from "./ApprovalsTab";
import AssignmentsTab from "./AssignmentsTab";
import StaffTab from "./StaffTab";

export default function SweepingDashboardPage() {
  const [activeTab, setActiveTab] = useState("admin");

  const tabs = [
    { id: "admin", label: "Command Center", icon: "📊" },
    { id: "reports", label: "Reports", icon: "📑" },
    { id: "approvals", label: "Approvals", icon: "✅" },
    { id: "assignments", label: "Assignments", icon: "🧭" },
    { id: "staff", label: "Staff", icon: "👷" },
  ];

  return (
    <ModuleGuard module="SWEEPING" roles={["CITY_ADMIN", "QC", "ACTION_OFFICER", "EMPLOYEE"]}>

      <div className="space-y-6 animate-fade">

        {/* HEADER BAR */}
        <div className="card glass flex-between">

          <div>
            <div className="text-lg font-semibold">Municipal Sweeping Command Center</div>

            <div className="text-xs muted flex items-center gap-2 mt-1">
              <span className="live-dot" />
              Real-time operational dashboard
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <span className="badge">SWEEPING</span>
            <span className="badge-success">System Online</span>
          </div>

        </div>

        {/* TABS */}
        <div className="tab-bar overflow-x-auto">

          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`tab ${activeTab === t.id ? "active" : ""}`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}

        </div>

        {/* CONTENT */}
        <div key={activeTab} className="space-y-6 animate-slide">

          {activeTab === "admin" && <AdminDashboard />}
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "approvals" && <ApprovalsTab />}
          {activeTab === "assignments" && <AssignmentsTab />}
          {activeTab === "staff" && <StaffTab />}

        </div>

      </div>

    </ModuleGuard>
  );
}
