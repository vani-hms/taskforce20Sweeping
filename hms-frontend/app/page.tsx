"use client";

import { useState } from "react";
import Link from "next/link";

type Card = {
  title: string;
  desc: string;
  href: string;
  icon: string;
  actions?: { label: string; href: string }[];
};

const cards: Card[] = [
  {
    title: "HMS Super Admin",
    desc: "Onboard cities, enable modules, and provision city admins.",
    href: "/hms",
    icon: "🏛️"
  },
  {
    title: "Modules",
    desc: "View module data scoped to your city.",
    href: "/modules",
    icon: "📦"
  },
  {
    title: "Sweeping",
    desc: "Module records (read-only).",
    href: "/modules/SWEEPING",
    icon: "🧹"
  },
  {
    title: "Litter Bins",
    desc: "Submit requests, assigned bins, and reports.",
    href: "/modules/litterbins",
    icon: "🗑️"
  },
  {
    title: "Taskforce",
    desc: "Module records (read-only).",
    href: "/modules/TASKFORCE",
    icon: "🛠️",
    actions: [
      { label: "Register Feeder Point", href: "/modules/taskforce" },
      { label: "My Feeder Requests", href: "/modules/taskforce" },
      { label: "Assigned Feeder Points", href: "/modules/taskforce/assigned" }
    ]
  }
];

export default function LandingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleCard = (title: string) => {
    setExpanded((prev) => (prev === title ? null : title));
  };

  return (
    <div className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">Welcome to</p>
          <h1>HMS Multicity Portal</h1>
          <p className="muted">
            Enterprise administration for cities, modules, and municipal teams. Choose a workspace to continue.
          </p>
        </div>
      </div>
      <div className="grid grid-3">
        {cards.map((card) => {
          const isTaskforce = card.title === "Taskforce";
          const isOpen = expanded === card.title;

          return (
            <div className="card card-hover" key={card.title}>
              <div className="card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p className="muted">{card.desc}</p>

              {!isTaskforce && (
                <Link className="btn btn-primary btn-sm" href={card.href}>
                  Open
                </Link>
              )}

              {isTaskforce && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => toggleCard(card.title)}>
                    {isOpen ? "Hide" : "Taskforce"}
                  </button>
                  {isOpen && card.actions && (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {card.actions.map((action) => (
                        <Link key={action.label} className="btn btn-secondary btn-sm" href={action.href}>
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
