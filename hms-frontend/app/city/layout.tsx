import { Protected, RoleGuard } from "@components/Guards";

const ALLOWED_ROLES = ["CITY_ADMIN", "HMS_SUPER_ADMIN"] as const;

export default function CityAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RoleGuard roles={[...ALLOWED_ROLES]}>
        <div className="page">
          <h1>City Admin</h1>
          {children}
        </div>
      </RoleGuard>
    </Protected>
  );
}
