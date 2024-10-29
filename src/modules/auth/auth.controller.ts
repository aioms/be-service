import "reflect-metadata";

import { Hono } from "hono";
import { container } from "tsyringe";
import { zValidator } from "@hono/zod-validator";

import { loginSchema } from "./validations/auth.validation.ts";
import { authenticate } from "../../common/middlewares/verify-jwt.ts";
import LoginHandler from "./handlers/auth.ts";
import UserHandler from "./handlers/user.ts";
import { authorizeRole } from "../../common/middlewares/authorize.ts";
import {
  createUserSchema,
  updateUserSchema,
} from "./validations/user.validation.ts";
import { formatValidation } from "../../common/utils/index.ts";

export default class AuthController {
  private readonly loginHandler = container.resolve(LoginHandler);
  private readonly userHandler = container.resolve(UserHandler);
  private readonly path = "/api/v1";

  init(app: Hono) {
    const route = new Hono();

    route.post(
      "/auth/login",
      zValidator("json", loginSchema, formatValidation),
      (c) => this.loginHandler.loginWithPassword(c),
    );
    route.post("/auth/logout", authenticate, (c) =>
      this.loginHandler.logout(c),
    );

    route.post(
      "/users",
      authenticate,
      authorizeRole(["admin"]),
      zValidator("json", createUserSchema, formatValidation),
      (c) => this.userHandler.createUser(c),
    );
    route.put(
      "/users",
      authenticate,
      zValidator("json", updateUserSchema, formatValidation),
      (c) => this.userHandler.updateUser(c),
    );
    route.delete("/users/:id", authenticate, (c) =>
      this.userHandler.softDeleteUser(c),
    );
    route.get("/users", authenticate, (c) =>
      this.userHandler.getUsersByFilter(c),
    );
    route.get("/users/:id", authenticate, (c) =>
      this.userHandler.getUserById(c),
    );

    app.route(this.path, route);
  }
}
