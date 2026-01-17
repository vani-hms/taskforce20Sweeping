import type { Metadata } from "next";
import { Providers } from "@components/Providers";
import { Sidebar } from "@components/ui/Sidebar";
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
              <div style={{ fontWeight: 700 }}>HMS Multicity Portal</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--muted)" }}>
                <span>Signed in</span>
              </div>
            </header>
            <main className="content">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
