'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@hooks/useAuth";
import { roleLabel } from "@lib/labels";

export function Topbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayRole = user?.roles?.length ? roleLabel(user.roles[0]) : "";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">HMS Multicity Portal</div>
        <div className="topbar-subtitle">Enterprise administration for cities and modules</div>
      </div>
      <div className="topbar-user">
        {loading ? (
          <div className="muted text-sm">Loading...</div>
        ) : user ? (
          <>
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || "H"}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name || "Signed in"}</div>
              <div className="user-role">{displayRole || "User"}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="btn btn-secondary btn-sm" href="/login">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
