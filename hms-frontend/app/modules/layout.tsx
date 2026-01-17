import { Protected } from "@components/Guards";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <div className="page">
        <h1>Modules</h1>
        {children}
      </div>
    </Protected>
  );
}
