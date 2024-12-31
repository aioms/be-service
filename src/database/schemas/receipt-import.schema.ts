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

export const receiptImportStatus = pgEnum(
  "receipt_import_status",
  Object.values(ReceiptImportStatus) as [string, ...string[]],
);

export const receiptImportTable = pgTable(DbTables.ReceiptImports, {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").unique(),
  note: text("note"),
  quantity: integer("quantity"),
  totalProduct: integer("total_product"),
  totalAmount: customNumeric("total_amount"),
  supplier: text("supplier"),
  warehouseLocation: text("warehouse_location"),
  paymentDate: timestamp("payment_date", { mode: "string" }),
  expectedImportDate: timestamp("expected_import_date", { mode: "string" }),
  status: receiptImportStatus("status").notNull(),
  userCreated: uuid("user_created").notNull(),
  statusChangeLogs: jsonb("status_change_logs"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertReceiptImport = typeof receiptImportTable.$inferInsert;
export type SelectReceiptImport = typeof receiptImportTable.$inferSelect;

export type UpdateReceiptImport = Partial<
  Omit<SelectReceiptImport, "id" | "receiptNumber" | "createdAt">
>;
