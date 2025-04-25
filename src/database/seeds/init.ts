import { customAlphabet } from "nanoid";
import { userTable } from "../schemas/user.schema.ts";
import { database } from "../../common/config/database.ts";
import { UserRole } from "../enums/user.enum.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL)
  throw new Error("DATABASE_URL not found on .env");

async function main() {
  const usersData: (typeof userTable.$inferInsert)[] = [
    {
      code: customAlphabet("1234567890", 3)(),
      username: "developer",
      password: "$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.",
      salt: "$2a$10$yyqYbpadt.JmaPGYY.zgue",
      fullname: "Developer",
      role: UserRole.DEVELOPER
    },
    {
      code: customAlphabet("1234567890", 3)(),
      username: "admin",
      password: "$2a$10$yyqYbpadt.JmaPGYY.zgue2OwcCFMXuYk.zrDcegMYRPQjNgOP4A.",
      salt: "$2a$10$yyqYbpadt.JmaPGYY.zgue",
      fullname: "Admin",
      role: UserRole.ADMIN,
    },
  ];

  console.time("Seeding");
  await database.insert(userTable).values(usersData);
  console.timeEnd("Seeding");

  Deno.exit(0);
}

main().catch((error) => {
  console.error(error);
  Deno.exit(1);
});
