'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import { ModuleApi } from "@lib/apiClient";
import type { ModuleName, Role } from "../../types/auth";

type ModuleMap = Record<string, string>;

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
  const [moduleMap, setModuleMap] = useState<ModuleMap>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const result = await ModuleApi.list();
        if (!mounted) return;
        const map: ModuleMap = {};
        result.modules.forEach((m) => {
          map[m.id] = m.name;
        });
        setModuleMap(map);
      } catch {
        // if module list fails, fall back to empty map
      }
    };
    if (user?.modules?.length) load();
    return () => {
      mounted = false;
    };
  }, [user?.modules?.length]);

  const moduleLinks = useMemo(() => {
    if (!user?.modules?.length) return [];
    return user.modules.map((m) => {
      const id = (m as any).moduleId || (m as any).module;
      const name = moduleMap[id] || (typeof (m as any).module === "string" ? (m as any).module : "Module");
      return { label: titleCase(name), href: `/modules/${name.toLowerCase()}` };
    });
  }, [user?.modules, moduleMap]);

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
      { label: "Municipal", href: "/municipal" }
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
