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
    <div className="page" style={{ backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)', backgroundSize: '40px 40px', minHeight: '100vh', padding: '16px 24px' }}>

      <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div className="breadcrumb" style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>City Admin</span>
            <span>/</span>
            <span>Overview</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>Active City Administration</h2>
            </div>
            {cityName && (
              <div className="badge" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 9999 }}>
                {cityName}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {cityLoading && <div className="skeleton" style={{ height: 40, width: 240 }} />}
          {!cityLoading && cityError && <div className="alert error">{cityError}</div>}
          {!cityLoading && !cityError && (
            <div style={{ display: 'flex', gap: 48 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>City Name</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{cityName || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>ULB Code</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{ulbCode || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ padding: '20px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Registration Requests</h3>
          <Link className="btn btn-secondary btn-sm" href="/registration-requests" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600, border: '1px solid #e2e8f0' }}>
            View All
          </Link>
        </div>

        {reqError && <div className="alert error" style={{ margin: 24 }}>{reqError}</div>}
        {!reqError && requests.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No pending requests found.</div>}
        {!reqError && requests.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 32px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px 32px' }}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 32px', fontWeight: 600, color: '#0f172a' }}>{r.name}</td>
                    <td style={{ padding: '16px 32px' }}>
                      <span style={{
                        background: r.status === 'APPROVED' ? '#dcfce7' : '#f1f5f9',
                        color: r.status === 'APPROVED' ? '#166534' : '#475569',
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 32px', textAlign: 'right' }}>
                      <Link href={`/registration-requests/${r.id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {cards.map((card) => (
          <Link href={card.href} key={card.title} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', height: '100%', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="card-icon" style={{ background: '#eff6ff', color: '#2563eb', width: 48, height: 48, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>{card.icon}</div>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                {card.desc}
              </p>
              <div style={{ marginTop: 20, fontSize: 14, fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                Open Module <span>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
