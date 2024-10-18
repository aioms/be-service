import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import config from "./index.ts";

const client = postgres(config.databaseUrl, { prepare: false });
export const database = drizzle(client);
