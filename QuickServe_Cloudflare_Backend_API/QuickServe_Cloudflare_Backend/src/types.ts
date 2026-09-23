export type Role = "CUSTOMER" | "AGENT" | "ADMIN";
export type Status = "CREATED" | "ASSIGNED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  GOOGLE_CLIENT_ID?: string;
  CORS_ORIGINS?: string;
  APP_NAME?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface AppVariables {
  user: AuthUser;
}
