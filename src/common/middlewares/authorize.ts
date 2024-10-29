import { createMiddleware } from "hono/factory";
// import { HTTPException } from "hono/http-exception";

export const authorizeRole = (roles) => {
  return createMiddleware(async (ctx, next) => {
    const payload = ctx.get("jwtPayload");
    console.log({ payload });

    // const isValidRoles = roles.some(role => payload.roles?.includes(role));
    // if (!isValidRoles) {
    //   throw new HTTPException(403, { message: "Forbidden" });
    // }
    await next();
  });
};
