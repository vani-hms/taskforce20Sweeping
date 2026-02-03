import { Role as RoleEnum } from "../../generated/prisma";
export type Role = (typeof RoleEnum)[keyof typeof RoleEnum];

export interface AuthClaims {
  sub: string; // userId
  cityId?: string; // active city context
  roles: Role[]; // city-level roles
  zoneIds?: string[];
  wardIds?: string[];
  modules: { moduleId: string; key: string; name?: string; role: Role; roles: Role[]; canWrite: boolean }[];
  exp?: number;
}

declare global {
  namespace Express {
    // Augment request with auth context
    interface Request {
      auth?: AuthClaims;
    }
  }
}
