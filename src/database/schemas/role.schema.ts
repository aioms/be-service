import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";

export const roleTable = pgTable(DbTables.Roles, {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export type InsertRole = typeof roleTable.$inferInsert;
export type SelectRole = typeof roleTable.$inferSelect;
