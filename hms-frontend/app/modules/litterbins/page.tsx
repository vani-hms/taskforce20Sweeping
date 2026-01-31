'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@hooks/useAuth";

export default function LitterbinsLanding() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const roles = user.roles || [];
    if (roles.includes("QC") || roles.includes("EMPLOYEE") || roles.includes("ACTION_OFFICER") || roles.includes("CITY_ADMIN") || roles.includes("ULB_OFFICER")) {
      router.replace("/modules/twinbin");
    } else {
      router.replace("/modules");
    }
  }, [user, router]);

  return null;
}
