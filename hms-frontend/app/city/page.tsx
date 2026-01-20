'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";

const cards = [
  {
    title: "Manage Zones",
    desc: "Create and manage zones within the city.",
    href: "/city/zones",
    icon: "🧭"
  },
  {
    title: "Manage Wards",
    desc: "Create wards under zones.",
    href: "/city/wards",
    icon: "🗺️"
  },
  {
    title: "Manage Areas & Beats",
    desc: "Define area types and beats under wards.",
    href: "/city/areas",
    icon: "📍"
  },
  {
    title: "Municipal Users",
    desc: "Create and manage municipal users and roles.",
    href: "/city/users",
    icon: "👥"
  }
];

export default function CityDashboardPage() {
  const [cityName, setCityName] = useState<string | null>(null);
  const [cityError, setCityError] = useState("");
  const [cityLoading, setCityLoading] = useState(true);

  useEffect(() => {
    const loadCity = async () => {
      try {
        setCityLoading(true);
        const res = await apiFetch<{ city: { id: string; name: string } }>("/city/info");
        setCityName(res.city.name);
      } catch (err) {
        setCityError(err instanceof ApiError ? err.message : "Failed to load city");
      } finally {
        setCityLoading(false);
      }
    };
    loadCity();
  }, []);

  return (
    <div className="page">
      <div className="card">
        <div className="breadcrumb">
          <span>City Admin</span>
          <span>/</span>
          <span>Dashboard</span>
        </div>
        <h2 style={{ marginBottom: 4 }}>Active City Administration</h2>
        {cityLoading && <div className="skeleton" style={{ height: 12, width: 140 }} />}
        {!cityLoading && cityError && <div className="alert error">{cityError}</div>}
        {!cityLoading && !cityError && (
          <>
            <p className="muted">You are managing hierarchy and users for your assigned city.</p>
            <div className="badge">{cityName || "Active City"}</div>
          </>
        )}
      </div>

      <div className="grid grid-2">
        {cards.map((card) => (
          <div className="card card-hover" key={card.title}>
            <div className="card-icon">{card.icon}</div>
            <h3 style={{ margin: "8px 0 4px" }}>{card.title}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              {card.desc}
            </p>
            <Link className="btn btn-primary btn-sm" href={card.href}>
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
