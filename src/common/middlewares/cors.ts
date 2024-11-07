import { createMiddleware } from "hono/factory";
import { cors } from "hono/cors";

export const corsMiddleware = createMiddleware((ctx, next) => {
  const corsMiddleware = cors({
    origin: "*",
    allowHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "authorization",
    ],
    allowMethods: ["*"],
    credentials: true,
  });
  return corsMiddleware(ctx, next);
});
