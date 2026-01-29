'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "@hooks/useAuth";
import { canonicalizeModules, routeForModule } from "@utils/modules";
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
    const isQc = !!user?.roles?.includes("QC");
    return canonical.map((m) => {
      const path = routeForModule(m.key);
      const href = m.key === "LITTERBINS" && isQc ? "/modules/litterbins/qc" : `/modules/${path}`;
      return {
        label: moduleLabel(m.key, m.name || m.key),
        href
      };
    });
  }, [user?.modules, user?.roles]);

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
    const common = [...moduleLinks];
    if (hasRole("QC")) {
      common.push({ label: "Employees", href: "/employees" });
    }
    links = common;
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
