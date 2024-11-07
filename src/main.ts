import "reflect-metadata";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { showRoutes } from "hono/dev";

import AuthModule from "./modules/auth/auth.module.ts";
import ProductModule from "./modules/product/product.module.ts";

import { corsMiddleware } from "./common/middlewares/cors.ts";

const startServer = () => {
  const app = new Hono();

  app.use(compress());
  app.use(logger());

  app.use("*", requestId());
  app.use("*", corsMiddleware);

  AuthModule.init(app);
  ProductModule.init(app);

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
};

startServer();
