import { defineConfig } from "drizzle-kit";

console.log({ url: Deno.env.get("DATABASE_URL")! })

export default defineConfig({
  schema: "./src/database/schemas/*.schema.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL")!,
  },
  // migrations: {
  //   schema: "public",
  // },
});
