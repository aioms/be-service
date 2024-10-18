import { Context } from "hono";
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

export interface IContext extends Context {
  user: User;
}
