import Link from "next/link";

const cards = [
  {
    title: "HMS Super Admin",
    desc: "Onboard cities, enable modules, and provision city admins.",
    href: "/hms",
    icon: "🛡️"
  },
  {
    title: "City Admin",
    desc: "Manage geo hierarchy, municipal staff, and module access for your city.",
    href: "/city",
    icon: "🏙️"
  },
  {
    title: "Municipal Commissioner",
    desc: "City-wide oversight and reporting.",
    href: "/municipal/commissioner",
    icon: "🏛️"
  },
  {
    title: "Taskforce Module",
    desc: "Create, assign, and track operational cases.",
    href: "/modules/taskforce",
    icon: "🗂️"
  },
  {
    title: "IEC Module",
    desc: "Capture IEC submissions and review summaries.",
    href: "/modules/iec",
    icon: "📑"
  },
  {
    title: "Login",
    desc: "Sign in to continue to your workspace.",
    href: "/login",
    icon: "🔐"
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
