export type Role =
  | "HMS_SUPER_ADMIN"
  | "CITY_ADMIN"
  | "COMMISSIONER"
  | "ACTION_OFFICER"
  | "EMPLOYEE"
  | "QC";

export type ModuleName =
  | "TASKFORCE"
  | "IEC"
  | "MODULE3"
  | "MODULE4"
  | "MODULE5"
  | "MODULE6"
  | "MODULE7"
  | "MODULE8";

export interface ModuleAssignment {
  module: ModuleName;
  roles: Role[];
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  cityId?: string;
  cityName?: string;
  roles: Role[]; // city-level roles
  modules: ModuleAssignment[];
  token?: string;
}
