import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";
import { zValidator } from "@hono/zod-validator";

import LoginHandler from "./handlers/login.ts";
import { loginSchema } from "./validations/login.validation.ts";
import { authenticate } from "../../../../common/middlewares/verify-jwt.ts";

export default class AuthController {
  private readonly loginHandler = container.resolve(LoginHandler);
  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    route.post("/auth/login", zValidator("json", loginSchema), (c) =>
      this.loginHandler.loginWithPassword(c),
    );
    route.post("/auth/logout", authenticate, (c) =>
      this.loginHandler.logout(c),
    );

    // route.post("/users", authenticate, loginHandler.logout);

    app.route(this.path, route);
  }
}
