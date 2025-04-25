import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";

import { productTable } from "./product.schema.ts";
import { supplierTable } from "./supplier.schema.ts";

export const productSupplierTable = pgTable(DbTables.ProductSuppliers, {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => supplierTable.id, { onDelete: "cascade" }),
  costPrice: customNumeric("cost_price").default(0),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

// Types for TypeScript
export type InsertProductSupplier = typeof productSupplierTable.$inferInsert;
export type SelectProductSupplier = typeof productSupplierTable.$inferSelect;

// Indexes for better query performance
export const productSupplierIndexes = {
  productIdIdx: sql`CREATE INDEX IF NOT EXISTS product_supplier_product_id_idx ON ${productSupplierTable} (product_id)`,
  supplierIdIdx: sql`CREATE INDEX IF NOT EXISTS product_supplier_supplier_id_idx ON ${productSupplierTable} (supplier_id)`,
  uniqueProductSupplierIdx: sql`CREATE UNIQUE INDEX IF NOT EXISTS product_supplier_unique_idx ON ${productSupplierTable} (product_id, supplier_id)`,
};
