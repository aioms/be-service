import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const DATABASE_URL = Deno.env.get("DATABASE_URL")!;
const client = postgres(DATABASE_URL, { prepare: false });
export const database = drizzle(client);
