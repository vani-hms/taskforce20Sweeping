'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@hooks/useAuth";
import { hasModuleRole, hasRole, isHmsSuperAdmin } from "@utils/rbac";
import { ModuleName, Role } from "@types/auth";

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
  children
}: {
  module: ModuleName;
  roles: Role[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!hasModuleRole(user, module, roles) && !isHmsSuperAdmin(user)) {
    return (
      <div style={{ padding: 24 }}>
        <h3>Module access denied</h3>
        <p>You are not assigned to this module.</p>
      </div>
    );
  }
  return <>{children}</>;
}
