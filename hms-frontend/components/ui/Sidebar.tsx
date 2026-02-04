'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@hooks/useAuth";
import { canonicalizeModules, moduleEntryPath } from "@utils/modules";
import { moduleLabel } from "@lib/labels";
import type { Role } from "../../types/auth";

function titleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  const moduleLinks = useMemo(() => {
    const canonical = canonicalizeModules(user?.modules || []);
    if (!canonical.length) return [];
    const mLinks = canonical.map((m) => ({
      label: moduleLabel(m.key, m.name || m.key),
      href: moduleEntryPath(user || null, m.key),
      key: m.key
    }));
    // Sort: TOILET first
    return mLinks.sort((a, b) => {
      if (a.key === "TOILET") return -1;
      if (b.key === "TOILET") return 1;
      return 0;
    });
  }, [user?.modules, user?.roles]);

  let links: { label: string; href: string }[] = [];
  if (!user) {
    links = [
      { label: "Home", href: "/" },
      { label: "Login", href: "/login" }
    ];
  } else {
    // Strictly render modules from auth token; no role-based injection
    links = [{ label: "Home", href: "/" }];

    if (user.roles.includes("HMS_SUPER_ADMIN" as Role)) {
      links.push({ label: "HMS Super Admin", href: "/hms" });
    }
    if (user.roles.includes("CITY_ADMIN" as Role) || user.roles.includes("COMMISSIONER" as Role)) {
      links.push({ label: "City Dashboard", href: "/city" });
    }
    links.push(...moduleLinks);
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">H</div>
        <div>
          <div className="logo-title">HMS Admin</div>
          <div className="logo-sub">Multicity Portal</div>
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Navigation</div>
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link key={link.href} className={`nav-link ${active ? "active" : ""}`} href={link.href}>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="nav-section" style={{ marginTop: "auto" }}>
        {!loading && user && (
          <button className="btn btn-secondary btn-sm w-full" onClick={handleLogout}>
            Logout
          </button>
        )}
        {!loading && !user && (
          <Link className="btn btn-secondary btn-sm w-full" href="/login">
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}
