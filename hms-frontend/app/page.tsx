import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="page">
      <div className="card">
        <h2>HMS Multicity Portal</h2>
        <p>Select a space to continue.</p>
        <ul>
          <li>
            <Link href="/login">Login</Link>
          </li>
          <li>
            <Link href="/hms">HMS Super Admin</Link>
          </li>
          <li>
            <Link href="/city">City Admin</Link>
          </li>
          <li>
            <Link href="/municipal/commissioner">Municipal Commissioner</Link>
          </li>
          <li>
            <Link href="/modules/taskforce">Taskforce Module</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
