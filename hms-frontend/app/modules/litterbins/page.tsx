'use client';

import TwinbinPage from "../twinbin/page";
import { useAuth } from "@hooks/useAuth";
import { useEffect } from "react";

export default function LitterbinsLanding() {
  // reuse existing twinbin dashboard; module key is already handled server-side
  const { user } = useAuth();

  // guard: users must have the module; fallback is already handled in TwinbinPage
  useEffect(() => {
    // no-op hook to keep client component boundary
  }, [user]);

  return <TwinbinPage />;
}
