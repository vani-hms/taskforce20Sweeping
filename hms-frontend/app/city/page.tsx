'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch, RegistrationApi } from "@lib/apiClient";

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
  const [ulbCode, setUlbCode] = useState<string | null>(null);
  const [cityError, setCityError] = useState("");
  const [cityLoading, setCityLoading] = useState(true);
  const [requests, setRequests] = useState<{ id: string; name: string; status: string }[]>([]);
  const [reqError, setReqError] = useState("");

  useEffect(() => {
    const loadCity = async () => {
      try {
        setCityLoading(true);
        const res = await apiFetch<{ city: { id: string; name: string; ulbCode?: string } }>("/city/info");
        setCityName(res.city.name);
        setUlbCode(res.city.ulbCode || null);
      } catch (err) {
        setCityError(err instanceof ApiError ? err.message : "Failed to load city");
      } finally {
        setCityLoading(false);
      }
    };
    const loadRequests = async () => {
      try {
        const data = await RegistrationApi.listRequests();
        setRequests((data.requests || []).slice(0, 5));
        setReqError("");
      } catch (err) {
        setReqError(err instanceof ApiError ? err.message : "Failed to load registration requests");
      }
    };
    loadCity();
    loadRequests();
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
            {ulbCode ? <div className="muted" style={{ marginTop: 4 }}>ULB Code: {ulbCode}</div> : null}
          </>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Recent Registration Requests</h3>
          {reqError && <div className="alert error">{reqError}</div>}
          {!reqError && requests.length === 0 && <p className="muted">No registration requests.</p>}
          {!reqError && requests.length > 0 && (
            <div className="table-grid">
              <div className="table-head">
                <div>Name</div>
                <div>Status</div>
              </div>
              {requests.map((r) => (
                <div className="table-row" key={r.id}>
                  <div>{r.name}</div>
                  <div>{r.status}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <Link className="btn btn-secondary btn-sm" href="/registration-requests">
              View all requests
            </Link>
          </div>
        </div>
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
