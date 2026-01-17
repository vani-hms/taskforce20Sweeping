import { Protected, RoleGuard } from "@components/Guards";

const ALLOWED = ["COMMISSIONER", "ACTION_OFFICER", "HMS_SUPER_ADMIN", "CITY_ADMIN"] as const;

export default function MunicipalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RoleGuard roles={[...ALLOWED]}>
        <div className="page">
          <h1>Municipal Corporation</h1>
          {children}
        </div>
      </RoleGuard>
    </Protected>
  );
}
