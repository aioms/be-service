import "reflect-metadata";
import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { compress } from "hono/compress";
import AuthModule from "./modules/auth/features/v1/auth.module.ts";

const app = new Hono();

app.use(compress());
app.use("*", requestId());

AuthModule.init(app);

app.get("/ping", (c) => {
  return c.text("PONG!");
});

app.notFound((c) => {
  return c.text("Custom 404 Message", 404);
});

app.onError((err, c) => {
  console.error(`${err}`);
  return c.text("Custom Error Message", 500);
});

Deno.serve(app.fetch);
