import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { ReceiptCheckStatus } from "../../modules/product/enums/receipt.enum.ts";
import { userTable } from "./user.schema.ts";

export const receiptCheckStatus = pgEnum(
  "receipt_check_status",
  Object.values(ReceiptCheckStatus) as [string, ...string[]],
);

export const receiptCheckTable = pgTable(DbTables.ReceiptChecks, {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").unique().notNull(),
  note: text("note"),
  periodic: text("periodic"), // Đợt kiểm: Q1, Q2, Q3, Q4, đột xuất
  supplier: text("supplier"),
  date: timestamp("date", { mode: "string" }),
  status: receiptCheckStatus("status").notNull(),
  checker: uuid("checker")
    .notNull()
    .references(() => userTable.id),
  userCreated: uuid("user_created").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertReceiptCheck = typeof receiptCheckTable.$inferInsert;
export type SelectReceiptCheck = typeof receiptCheckTable.$inferSelect;

export type UpdateReceiptCheck = Partial<
  Omit<SelectReceiptCheck, "id" | "receiptNumber" | "createdAt" | "userCreated">
>;
