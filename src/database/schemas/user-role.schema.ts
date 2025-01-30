import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { roleTable } from "./role.schema.ts";
import { userTable } from "./user.schema.ts";
import { DbTables } from "../../common/config/index.ts";

export const userRoleTable = pgTable(
  DbTables.UserRoles,
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleTable.id),
  },
  // (table) => {
  //   return {
  //     pk: primaryKey({ columns: [table.userId, table.roleId] }),
  //     pkWithCustomName: primaryKey({
  //       name: "user_role_pk",
  //       columns: [table.userId, table.roleId],
  //     }),
  //   };
  // },
);

export type InsertUserRole = typeof userRoleTable.$inferInsert;
export type SelectUserRole = typeof userRoleTable.$inferSelect;
