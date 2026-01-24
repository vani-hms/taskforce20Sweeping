'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@hooks/useAuth";
import { canWriteModule, getModuleAssignment, hasRole, isHmsSuperAdmin } from "@utils/rbac";
import type { ModuleName, Role } from "../types/auth";

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (!user) {
    return <div>Checking access...</div>;
  }
  return <>{children}</>;
}

export function RoleGuard({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!hasRole(user, roles)) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Access denied</h3>
        <p>You do not have permission to view this area.</p>
        <Link href="/login">Return to login</Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function ModuleGuard({
  module,
  roles,
  children,
  requireWrite = false
}: {
  module: ModuleName;
  roles: Role[];
  children: React.ReactNode;
  requireWrite?: boolean;
}) {
  const { user } = useAuth();
  const assigned = getModuleAssignment(user, module);
  const allowedByRole = hasRole(user, roles) || isHmsSuperAdmin(user);

  if (!assigned && !allowedByRole) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Module access denied</h3>
        <p>You are not assigned to this module.</p>
      </div>
    );
  }
  if (!allowedByRole) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Access denied</h3>
        <p>You do not have permission to view this area.</p>
        <Link href="/login">Return to login</Link>
      </div>
    );
  }
  if (requireWrite && !canWriteModule(user, module)) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Write access denied</h3>
        <p>Your role does not allow modifying this module.</p>
      </div>
    );
  }
  return <>{children}</>;
}
