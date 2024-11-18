import { z } from "zod";

const configSchema = z.object({
  env: z.string(),
  domain: z.string().url(),
  tz: z.string(),
  databaseUrl: z.string(),
  authJwtSecret: z.string(),
  authApiKey: z.string(),
  sentryDsn: z.string(),
});

export type Config = z.infer<typeof configSchema>;

const config = {
  env: Deno.env.get("DENO_ENV"),
  domain: Deno.env.get("DOMAIN"),
  tz: Deno.env.get("TZ"),
  authJwtSecret: Deno.env.get("AUTH_JWT_SECRET"),
  authApiKey: Deno.env.get("AUTH_API_KEY"),
  databaseUrl: Deno.env.get("DATABASE_URL"),
  sentryDsn: Deno.env.get("SENTRY_DSN"),
  retryMaxAttempts: Deno.env.get("RETRY_MAX_ATTEMPTS"),
};

// Validate the configuration
const parsedConfig = configSchema.safeParse(config);

if (!parsedConfig.success) {
  console.error("Invalid env:", parsedConfig.error.format());
  // throw new Error("Invalid env");
}

export const DbTables = Object.freeze({
  Users: "users",
  Roles: "roles",
  UserRoles: "user_roles",
  Products: "products",
});

export default parsedConfig.data;
