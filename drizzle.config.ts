import config from "./src/common/config/index.ts";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/modules/**/*.schema.ts",
  out: "./src/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseUrl,
  },
});
