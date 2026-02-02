'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@hooks/useAuth";
import { getPostLoginRedirect } from "@utils/modules";

export default function LitterbinsLanding() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.roles?.includes("ACTION_OFFICER")) return;
    router.replace(getPostLoginRedirect(user));
  }, [loading, user, router]);

  if (loading) return null;
  if (user?.roles?.includes("ACTION_OFFICER")) {
    return (
      <div className="card">
        <h3>Unauthorized for this module</h3>
        <p className="muted">Action Officer access is not allowed on Employee or QC workspaces.</p>
      </div>
    );
  }

  return null;
}
