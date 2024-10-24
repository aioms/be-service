import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { UserStatus } from "../../modules/auth/enums/auth.enum.ts";
import { DbTables } from "../../common/config/index.ts";

export const userStatus = pgEnum(
  "user_status",
  Object.values(UserStatus) as [string, ...string[]],
);

export const userTable = pgTable(DbTables.Users, {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  password: text("password"),
  salt: text("salt"),
  fullname: text("fullname"),
  phone: text("phone"),
  storeCode: text("store_code"),
  status: userStatus("status").notNull(),
  tokenVersion: text("token_version"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export type InsertUser = typeof userTable.$inferInsert;
export type SelectUser = typeof userTable.$inferSelect;
