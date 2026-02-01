'use client';

import { ModuleGuard, Protected } from "@components/Guards";
import TaskforceQCDashboard from "../../components/QCDashboard";

export default function TaskforceQcDashboardPage() {
    return (
        <Protected>
            <ModuleGuard module="TASKFORCE" roles={["QC", "CITY_ADMIN", "ULB_OFFICER", "COMMISSIONER"]}>
                <TaskforceQCDashboard />
            </ModuleGuard>
        </Protected>
    );
}
