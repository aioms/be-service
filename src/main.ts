import "reflect-metadata";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { showRoutes } from "hono/dev";
import AuthModule from "./modules/auth/auth.module.ts";

const app = new Hono();

app.use(compress());
app.use("*", requestId());
app.use(logger());

app.use("*", (c, next) => {
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
  return corsMiddleware(c, next);
});

AuthModule.init(app);

app.get("/ping", (c) => {
  return c.text("PONG!");
});

app.notFound((c) => {
  return c.text("Not Found Page - 404", 404);
});

app.onError((err: any, ctx) => {
  console.error(`${err}`);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return ctx.json(
    {
      message: `${err}`,
      success: false,
      statusCode: 500,
    },
    500,
  );
});

showRoutes(app, {
  verbose: true,
});

Deno.serve(
  {
    port: parseInt(Deno.env.get("PORT") || "2005"),
  },
  app.fetch,
);
