'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@hooks/useAuth";
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
    if (!user?.modules?.length) return [];
    return user.modules.map((m) => ({
      label: titleCase(m.name || m.key),
      href: `/modules/${(m.key || "").toLowerCase()}`
    }));
  }, [user?.modules]);

  const hasRole = (r: Role) => Boolean(user?.roles?.includes(r));

  let links: { label: string; href: string }[] = [];
  if (!user) {
    links = [
      { label: "Home", href: "/" },
      { label: "Login", href: "/login" }
    ];
  } else if (hasRole("HMS_SUPER_ADMIN")) {
    links = [
      { label: "Home", href: "/" },
      { label: "HMS Super Admin", href: "/hms" }
    ];
  } else if (hasRole("CITY_ADMIN")) {
    links = [
      { label: "Home", href: "/" },
      { label: "City Admin", href: "/city" },
      { label: "Municipal", href: "/municipal" },
      ...moduleLinks
    ];
  } else if (hasRole("COMMISSIONER")) {
    links = [
      { label: "City Overview", href: "/city" },
      ...moduleLinks
    ];
  } else if (hasRole("ACTION_OFFICER") || hasRole("QC") || hasRole("EMPLOYEE")) {
    links = moduleLinks;
  } else {
    links = [{ label: "Home", href: "/" }];
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
