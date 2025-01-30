import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import {
  ReceiptReturnStatus,
  ReceiptReturnType,
} from "../../modules/product/enums/receipt.enum.ts";

export const receiptReturnStatus = pgEnum(
  "receipt_return_status",
  Object.values(ReceiptReturnStatus) as [string, ...string[]]
);

export const receiptReturnType = pgEnum(
  "receipt_return_type",
  Object.values(ReceiptReturnType) as [string, ...string[]]
);

export const receiptReturnTable = pgTable(DbTables.ReceiptReturns, {
  id: uuid("id").primaryKey().defaultRandom(),
  receiptNumber: text("receipt_number").unique().notNull(),
  name: text("name"),
  note: text("note"),
  quantity: integer("quantity").notNull(),
  totalProduct: integer("total_product").notNull(),
  totalAmount: customNumeric("total_amount").notNull(),
  reason: text("reason"),
  warehouseLocation: text("warehouse_location"),
  status: receiptReturnStatus("status").notNull(),
  type: receiptReturnType("type").notNull(),
  returnDate: timestamp("return_date", { mode: "string" }),
  userCreated: uuid("user_created").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertReceiptReturn = typeof receiptReturnTable.$inferInsert;
export type SelectReceiptReturn = typeof receiptReturnTable.$inferSelect;

export type UpdateReceiptReturn = Partial<
  Omit<SelectReceiptReturn, "id" | "receiptNumber" | "createdAt">
>;
