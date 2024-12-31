// path to a file with schema you want to reset
import { drizzle } from "drizzle-orm/postgres-js";
import { reset } from "drizzle-seed";
import { roleTable } from "../schemas/role.schema.ts";
import { userTable } from "../schemas/user.schema.ts";
import { userRoleTable } from "../schemas/user-role.schema.ts";

async function main() {
  const db = drizzle(Deno.env.get("DATABASE_URL")!);
  await reset(db, {
    roleTable,
    userTable,
    userRoleTable,
  });
}

main();
