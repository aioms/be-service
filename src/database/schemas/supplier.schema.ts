import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import { SupplierStatus } from "../../modules/supplier/enums/supplier.enum.ts";

export const supplierStatus = pgEnum(
  "supplier_status",
  Object.values(SupplierStatus) as [string, ...string[]],
);

export const supplierTable = pgTable(DbTables.Suppliers, {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  taxCode: text("tax_code"),
  address: text("address"),
  note: text("note"),
  totalDebt: customNumeric("total_debt", {
    precision: 15,
    scale: 2,
  }).default(0),
  totalPurchased: customNumeric("total_purchased", {
    precision: 15,
    scale: 2,
  }).default(0),
  status: supplierStatus("status").default(SupplierStatus.COLLABORATING),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export type InsertSupplier = typeof supplierTable.$inferInsert;
export type SelectSupplier = typeof supplierTable.$inferSelect;

export type UpdateSupplier = Partial<
  Omit<SelectSupplier, "id" | "code" | "createdAt">
>;
