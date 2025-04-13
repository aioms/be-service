import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import { ReceiptImportStatus } from "../../modules/product/enums/receipt.enum.ts";
import { supplierTable } from "./supplier.schema.ts";

export const receiptImportStatus = pgEnum(
  "receipt_import_status",
  Object.values(ReceiptImportStatus) as [string, ...string[]],
);

export interface ChangeLog {
  user: string;
  oldStatus: ReceiptImportStatus;
  newStatus: ReceiptImportStatus;
  timestamp: string;
}

export const receiptImportTable = pgTable(DbTables.ReceiptImports, {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").unique().notNull(),
  note: text("note"),
  quantity: integer("quantity").default(0),
  totalProduct: integer("total_product").default(0),
  totalAmount: customNumeric("total_amount").default(0),
  supplier: uuid("supplier")
    .notNull()
    .references(() => supplierTable.id),
  warehouse: text("warehouse"),
  paymentDate: timestamp("payment_date", { mode: "string" }),
  expectedImportDate: timestamp("expected_import_date", { mode: "string" }),
  status: receiptImportStatus("status").notNull(),
  userCreated: uuid("user_created").notNull(),
  statusChangeLogs: jsonb("status_change_logs"),
  changeLog: jsonb("change_logs").$type<ChangeLog[]>().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertReceiptImport = typeof receiptImportTable.$inferInsert;
export type SelectReceiptImport = typeof receiptImportTable.$inferSelect;

export type UpdateReceiptImport = Partial<
  Omit<SelectReceiptImport, "id" | "receiptNumber" | "createdAt">
>;
