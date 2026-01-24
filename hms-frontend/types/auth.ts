export type Role =
  | "HMS_SUPER_ADMIN"
  | "CITY_ADMIN"
  | "COMMISSIONER"
  | "ACTION_OFFICER"
  | "EMPLOYEE"
  | "QC";

export type ModuleKey = string;
export type ModuleName = ModuleKey;

export interface ModuleAssignment {
  moduleId?: string;
  key: ModuleKey;
  name?: string;
  canWrite: boolean;
  roles?: Role[];
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  cityId?: string;
  cityName?: string;
  roles: Role[]; // city-level roles
  modules: ModuleAssignment[];
  token?: string;
}
