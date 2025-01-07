import { Hono } from "hono";
import { assertEquals } from "@std/assert";

Deno.test("Ping", async () => {
  const app = new Hono();
  app.get("/", (c) => c.text("Please test me"));

  const res = await app.request("http://localhost:2005/ping", {
    method: "GET",
  });
  assertEquals(res.status, 404);
});
