import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { DbTables } from "../../common/config/index.ts";
import { customNumeric } from "../custom/data-types.ts";
import { ProductStatus } from "../../modules/product/enums/product.enum.ts";

export const productStatus = pgEnum(
  "product_status",
  Object.values(ProductStatus) as [string, ...string[]],
);

export const productTable = pgTable(DbTables.Products, {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category"),
  productCode: text("product_code").unique(),
  productName: text("product_name").notNull(),
  sellingPrice: integer("selling_price"),
  costPrice: customNumeric("cost_price"),
  inventory: integer("inventory"),
  unit: text("unit"),
  supplier: text("supplier"),
  additionalDescription: text("additional_description"),
  imageUrls: text("image_urls")
    .array()
    .default(sql`ARRAY[]::text[]`),
  warehouseLocation: text("warehouse_location"),
  status: productStatus("status").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertProduct = typeof productTable.$inferInsert;
export type SelectProduct = typeof productTable.$inferSelect;

export type UpdateProduct = Partial<
  Omit<SelectProduct, "id" | "productCode" | "createdAt">
>;
