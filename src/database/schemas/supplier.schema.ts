import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { CommonStatus } from "../../common/enums/index.ts";

export const supplierStatus = pgEnum(
  "supplier_status",
  Object.values(CommonStatus) as [string, ...string[]]
);

export const supplierTable = pgTable(DbTables.Suppliers, {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique(),
  phone: text("phone"),
  status: supplierStatus("status").default(CommonStatus.Active),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export type InsertSupplier = typeof supplierTable.$inferInsert;
export type SelectSupplier = typeof supplierTable.$inferSelect;
