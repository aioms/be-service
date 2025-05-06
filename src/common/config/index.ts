import { z } from "zod";

const configSchema = z.object({
  env: z.string(),
  tz: z.string(),
  databaseUrl: z.string(),
  authJwtSecret: z.string(),
  authApiKey: z.string(),
});

export type Config = z.infer<typeof configSchema>;

const config = {
  env: Deno.env.get("DENO_ENV") || "development",
  tz: Deno.env.get("TZ"),
  authJwtSecret: Deno.env.get("AUTH_JWT_SECRET"),
  authApiKey: Deno.env.get("AUTH_API_KEY"),
  databaseUrl: Deno.env.get("DATABASE_URL"),
};

// Validate the configuration
const parsedConfig = configSchema.safeParse(config);
console.log({ parsedConfig, config })

if (!parsedConfig.success) {
  console.error("Invalid env:", parsedConfig.error.format());
  // throw new Error(`Invalid env: ${parsedConfig.error.format()}`);
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
  ProductSuppliers: "product_suppliers",
  UserActivities: "user_activities",
});

export default parsedConfig.data;
