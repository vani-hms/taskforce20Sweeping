import type { Metadata } from "next";
import { Providers } from "@components/Providers";
import Sidebar from "@components/ui/Sidebar";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HMS Multicity",
  description: "Multicity management portal"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <Providers>
          <Sidebar />
          <div className="main-area">
            <header className="topbar">
              <div className="topbar-left">
                <div className="topbar-title">HMS Multicity Portal</div>
                <div className="topbar-subtitle">Enterprise administration for cities and modules</div>
              </div>
              <div className="topbar-user">
                <div className="avatar">H</div>
                <div className="user-meta">
                  <div className="user-name">Signed in</div>
                  <div className="user-role">HMS Administrator</div>
                </div>
                <Link className="btn btn-secondary btn-sm" href="/login">
                  Logout
                </Link>
              </div>
            </header>
            <main className="content">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
