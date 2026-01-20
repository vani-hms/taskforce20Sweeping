'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "HMS Super Admin", href: "/hms", icon: "🛡️" },
  { label: "City Admin", href: "/city", icon: "🏙️" },
  { label: "Municipal", href: "/municipal", icon: "🏛️" },
  { label: "Taskforce", href: "/modules/taskforce", icon: "🗂️" },
  { label: "IEC", href: "/modules/iec", icon: "📑" }
];

export default function Sidebar() {
  const pathname = usePathname();
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
          const active = pathname === link.href;
          return (
            <Link key={link.href} className={`nav-link ${active ? "active" : ""}`} href={link.href}>
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
