import { Context, Next } from "hono";
import { jwt } from "hono/jwt";
import { env } from "hono/adapter";

export function authenticate(ctx: Context, next: Next) {
  const { AUTH_JWT_SECRET } = env(ctx);

  const jwtMiddleware = jwt({
    secret: AUTH_JWT_SECRET,
  });
  return jwtMiddleware(ctx, next);
}
