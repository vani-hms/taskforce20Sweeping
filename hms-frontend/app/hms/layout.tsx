import { Protected, RoleGuard } from "@components/Guards";

export default function HmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <RoleGuard roles={["HMS_SUPER_ADMIN"]}>
        <div className="page">
          <h1>HMS Super Admin</h1>
          {children}
        </div>
      </RoleGuard>
    </Protected>
  );
}
