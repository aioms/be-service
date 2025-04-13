import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

export const authorizeRole = (roles) => {
  return createMiddleware(async (ctx, next) => {
    const payload = ctx.get("jwtPayload");
    const { role } = payload;

    if (!roles.includes(role)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  });
};
