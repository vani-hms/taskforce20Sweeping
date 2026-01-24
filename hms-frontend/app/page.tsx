import Link from "next/link";

const cards = [
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
    title: "Sweeping Residential",
    desc: "Module records (read-only).",
    href: "/modules/SWEEP_RES",
    icon: "🧹"
  },
  {
    title: "Sweeping Commercial",
    desc: "Module records (read-only).",
    href: "/modules/SWEEP_COM",
    icon: "🏬"
  },
  {
    title: "Twinbin",
    desc: "Module records (read-only).",
    href: "/modules/TWINBIN",
    icon: "🗑️"
  },
  {
    title: "Taskforce",
    desc: "Module records (read-only).",
    href: "/modules/TASKFORCE",
    icon: "🛠️"
  }
];

export default function LandingPage() {
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
        {cards.map((card) => (
          <div className="card card-hover" key={card.title}>
            <div className="card-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <p className="muted">{card.desc}</p>
            <Link className="btn btn-primary btn-sm" href={card.href}>
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
