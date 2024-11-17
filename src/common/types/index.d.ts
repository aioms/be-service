import { SQL } from "drizzle-orm";
import { Role } from "../enums/index.ts";

declare module "hono" {
  interface ContextVariableMap {
    user: User;
  }
}

export interface UserInfo {
  id: string;
  fullname: string;
  role: Role;
}

export interface User {
  info: UserInfo;
  jwt: string;
}

export interface ResponseType<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T | T[];
  metadata?: Record<string, any>;
}

export interface RepositoryOption {
  select: Record<string, any>;
  where: SQL[];
  orderBy?: SQL[];
  limit?: number;
  offset?: number;
  isCount?: boolean;
}

export interface RepositoryOptionUpdate<T> {
  where: SQL[];
  set: T;
}

export interface RepositoryResult<T = any> {
  data: T | T[];
  error: any;
  count?: number | null;
}
