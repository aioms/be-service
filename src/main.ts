import "reflect-metadata";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { logger } from "hono/logger";
import { compress } from "hono/compress";
import { showRoutes } from "hono/dev";
// import { timeout } from "hono/timeout";

// Middlewares
import { corsMiddleware } from "./common/middlewares/cors.ts";

// Modules
import AuthModule from "./modules/auth/auth.module.ts";
import ProductModule from "./modules/product/product.module.ts";
import InventoryModule from "./modules/inventory/inventory.module.ts";

// Utils
import { isDev } from "./common/utils/index.ts";

const startServer = () => {
  const app = new Hono();

  app.use(compress());
  app.use(logger());
  // app.use(timeout(10_000));

  app.use("*", requestId());
  app.use("*", corsMiddleware);

  AuthModule.init(app);
  ProductModule.init(app);
  InventoryModule.init(app);

  app.get("/ping", (c) => {
    return c.text("PONG!");
  });

  app.notFound((c) => {
    return c.text("Not Found Page - 404", 404);
  });

  app.onError((err: Error, ctx) => {
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

  if (isDev()) {
    showRoutes(app, {
      verbose: true,
    });
  }

  Deno.serve(
    {
      port: parseInt(Deno.env.get("PORT") || "2005"),
    },
    app.fetch,
  );
};

startServer();
