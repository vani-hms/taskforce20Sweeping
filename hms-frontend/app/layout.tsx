import type { Metadata } from "next";
import { Providers } from "@components/Providers";
import Sidebar from "@components/ui/Sidebar";
import { Topbar } from "@components/ui/Topbar";
import "./globals.css";
import "leaflet/dist/leaflet.css";


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
            <Topbar />
            <main className="content">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
