'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/" },
  { label: "HMS Super Admin", href: "/hms" },
  { label: "City Admin", href: "/city" },
  { label: "Municipal", href: "/municipal" },
  { label: "Taskforce", href: "/modules/taskforce" },
  { label: "IEC", href: "/modules/iec" }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="logo">HMS Admin</div>
      <div className="nav-section">
        <div className="nav-label">Navigation</div>
        {links.map((link) => (
          <Link key={link.href} className={`nav-link ${pathname === link.href ? "active" : ""}`} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
