import { roleTable } from "../schemas/role.schema.ts";
import { userTable } from "../schemas/user.schema.ts";
import { database } from "../../common/config/database.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL)
  throw new Error("DATABASE_URL not found on .env");

async function main() {
  const rolesData: (typeof roleTable.$inferInsert)[] = [
    { name: "admin" },
    { name: "user" },
    { name: "supervisor" }
  ];

  const usersData: (typeof userTable.$inferInsert)[] = [
    {
      username: "admin",
      password: "$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.",
      salt: "$2a$10$yyqYbpadt.JmaPGYY.zgue",
      fullname: "Admin",
      status: "active",
    },
  ];

  console.log("Seed start");
  await database.insert(roleTable).values(rolesData);
  await database.insert(userTable).values(usersData);
  console.log("Seed done");

  Deno.exit(0);
}

main().catch((error) => {
  console.error(error);
  Deno.exit(1);
});
