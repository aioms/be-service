import { sql } from "drizzle-orm";
import { pgTable, pgEnum, uuid, timestamp } from "drizzle-orm/pg-core";

import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import { InventoryChangeType } from "../enums/inventory.enum.ts";

import { productTable } from "./product.schema.ts";
import { userTable } from "./user.schema.ts";

export const inventoryChangeType = pgEnum(
  "inventory_change_type",
  Object.values(InventoryChangeType) as [string, ...string[]]
);

export const productInventoryLogTable = pgTable(DbTables.ProductInventoryLogs, {
  id: uuid("id").primaryKey().defaultRandom(),

  // Product reference
  productId: uuid("product_id")
    .notNull()
    .references(() => productTable.id),

  // Change details
  changeType: inventoryChangeType("change_type").notNull(),

  // Inventory changes
  previousInventory: customNumeric("previous_inventory").notNull(),
  inventoryChange: customNumeric("inventory_change").notNull(),
  currentInventory: customNumeric("current_inventory").notNull(),

  // Cost price changes
  previousCostPrice: customNumeric("previous_cost_price"),
  costPriceChange: customNumeric("cost_price_change"),
  currentCostPrice: customNumeric("current_cost_price"),

  // Reference information
  referenceId: uuid("reference_id"), // ID of related document (receipt import, return, check)

  // Audit fields
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.id),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export type InsertProductInventoryLog =
  typeof productInventoryLogTable.$inferInsert;
export type SelectProductInventoryLog =
  typeof productInventoryLogTable.$inferSelect;

// // Indexes for better query performance
export const productInventoryLogIndexes = {
  productIdIdx: sql`CREATE INDEX IF NOT EXISTS product_inventory_log_product_id_idx ON ${productInventoryLogTable} (product_id)`,
  createdAtIdx: sql`CREATE INDEX IF NOT EXISTS product_inventory_log_created_at_idx ON ${productInventoryLogTable} (created_at)`,
  changeTypeIdx: sql`CREATE INDEX IF NOT EXISTS product_inventory_log_change_type_idx ON ${productInventoryLogTable} (change_type)`,
  referenceIdIdx: sql`CREATE INDEX IF NOT EXISTS product_inventory_log_reference_id_idx ON ${productInventoryLogTable} (reference_id)`,
};
