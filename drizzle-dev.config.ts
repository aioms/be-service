import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schemas/*.schema.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL") || "postgresql://localhost:5432/aiom_db",
  },
  // migrations: {
  //   schema: "public",
  // },
});
