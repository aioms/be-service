import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  // uniqueIndex,
} from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import { SupplierStatus } from "../../modules/supplier/enums/supplier.enum.ts";

export const supplierStatus = pgEnum(
  "supplier_status",
  Object.values(SupplierStatus) as [string, ...string[]]
);

export const supplierTable = pgTable(
  DbTables.Suppliers,
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").unique(),
    name: text("name").unique(),
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
  },
  // (table) => ({
  //   uniqueCodeName: uniqueIndex("supplier_code_name_unique_idx").on(
  //     table.code,
  //     table.name
  //   ),
  // })
);

export type InsertSupplier = typeof supplierTable.$inferInsert;
export type SelectSupplier = typeof supplierTable.$inferSelect;

export type UpdateSupplier = Partial<
  Omit<SelectSupplier, "id" | "code" | "createdAt">
>;
