import { z } from "zod";

const configSchema = z.object({
  env: z.string(),
  tz: z.string(),
  databaseUrl: z.string(),
  authJwtSecret: z.string(),
  authApiKey: z.string(),
  // domain: z.string().url(),
  // sentryDsn: z.string(),
});

export type Config = z.infer<typeof configSchema>;

const config = {
  env: Deno.env.get("DENO_ENV") || "development",
  // domain: Deno.env.get("DOMAIN"),
  tz: Deno.env.get("TZ"),
  authJwtSecret: Deno.env.get("AUTH_JWT_SECRET"),
  authApiKey: Deno.env.get("AUTH_API_KEY"),
  databaseUrl: Deno.env.get("DATABASE_URL"),
  // sentryDsn: Deno.env.get("SENTRY_DSN"),
  retryMaxAttempts: Deno.env.get("RETRY_MAX_ATTEMPTS"),
};

// Validate the configuration
const parsedConfig = configSchema.safeParse(config);

if (!parsedConfig.success) {
  console.error("Invalid env:", parsedConfig.error.format());
  throw new Error("Invalid env");
}

export const DbTables = Object.freeze({
  Users: "users",
  Roles: "roles",
  UserRoles: "user_roles",
  Products: "products",
  ReceiptImports: "receipt_imports",
  ReceiptReturns: "receipt_returns",
  ReceiptChecks: "receipt_checks",
  ReceiptItems: "receipt_items",
  Suppliers: "suppliers",
  ProductInventoryLogs: "product_inventory_logs",
});

export default parsedConfig.data;
