'use client';

import { useAuth } from "@hooks/useAuth";
import { ModuleGuard } from "@components/Guards";
import { useState, useEffect } from "react";
import ReportsTab from "./ReportsTab";
import AllToiletsTab from "./AllToiletsTab";
import ApprovalsTab from "./ApprovalsTab";
import AssignmentsTab from "./AssignmentsTab";

import type { Role } from "../../../types/auth";

export default function ToiletModulePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("reports");

  const tabs: { id: string; label: string; roles: Role[] }[] = [
    { id: "reports", label: "Dashboard", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "all", label: "All Registered Toilets", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "approvals", label: "Verification & Approvals", roles: ["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"] },
    { id: "assignments", label: "Staff Assignments", roles: ["CITY_ADMIN", "HMS_SUPER_ADMIN"] },
  ];

  const visibleTabs = tabs.filter(tab =>
    tab.roles.some(role => user?.roles?.includes(role))
  );

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [user, visibleTabs, activeTab]);

  return (
    <ModuleGuard module="TOILET" roles={["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div style={{ padding: '0 0 20px 0' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
          padding: '24px',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>
              Cleanliness of Toilets {user?.cityName && <span style={{ color: '#64748b', fontWeight: 400 }}>| {user.cityName}</span>}
            </h1>
            <p className="muted" style={{ margin: '4px 0 0 0' }}>Manage toilet assets, inspections, and staff assignments.</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tab-container">
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "all" && <AllToiletsTab />}
          {activeTab === "approvals" && <ApprovalsTab />}
          {activeTab === "assignments" && <AssignmentsTab />}
        </div>
      </div>
    </ModuleGuard>
  );
}
