import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { ReceiptCheckStatus } from "../../modules/product/enums/receipt.enum.ts";
import { userTable } from "./user.schema.ts";
import { supplierTable } from "./supplier.schema.ts";

export const receiptCheckStatus = pgEnum(
  "receipt_check_status",
  Object.values(ReceiptCheckStatus) as [string, ...string[]],
);

export interface ChangeLog {
  user: string;
  oldStatus: ReceiptCheckStatus;
  newStatus: ReceiptCheckStatus;
  timestamp: string;
}

export interface ActivityLog {
  user: string;
  action: string;
  timestamp: string;
}

export const receiptCheckTable = pgTable(DbTables.ReceiptChecks, {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").unique().notNull(),
  note: text("note"),
  periodic: text("periodic"), // Đợt kiểm: Q1, Q2, Q3, Q4, đột xuất
  warehouse: text("warehouse"),
  supplier: uuid("supplier")
    .notNull()
    .references(() => supplierTable.id),
  date: timestamp("date", { mode: "string" }),
  status: receiptCheckStatus("status").notNull(),
  checker: uuid("checker")
    .notNull()
    .references(() => userTable.id),
  changeLog: jsonb("change_logs").$type<ChangeLog[]>().default([]),
  activityLog: jsonb("activity_logs").$type<ActivityLog[]>().default([]),
  userCreated: uuid("user_created").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertReceiptCheck = typeof receiptCheckTable.$inferInsert;
export type SelectReceiptCheck = typeof receiptCheckTable.$inferSelect;

export type UpdateReceiptCheck = Partial<
  Omit<SelectReceiptCheck, "id" | "receiptNumber" | "createdAt" | "userCreated">
>;
