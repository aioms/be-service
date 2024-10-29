import { Hono } from "hono";
import { container, registry } from "tsyringe";
import AuthController from "./auth.controller.ts";
import { UserRepository } from "../../database/repositories/user.repository.ts";
import { AuthRepository } from "../../database/repositories/auth.repository.ts";

@registry([
  {
    token: UserRepository,
    useClass: UserRepository,
  },
  {
    token: AuthRepository,
    useClass: AuthRepository,
  },
])
export default class AuthModule {
  static init(app: Hono) {
    const controller = container.resolve(AuthController);
    controller.init(app);
  }
}
