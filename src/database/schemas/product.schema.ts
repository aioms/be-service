import { sql, SQL } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
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
  productCode: text("product_code").unique(),
  productName: text("product_name").notNull(),
  sellingPrice: customNumeric("selling_price").default(0),
  costPrice: customNumeric("cost_price").default(0),
  discount: customNumeric("discount").default(0),
  inventory: customNumeric("inventory").default(0),
  unit: text("unit"),
  category: text("category"),
  description: text("description"),
  note: text("note"),
  imageUrls: text("image_urls")
    .array()
    .default(sql`ARRAY[]::text[]`),
  warehouse: text("warehouse"),
  status: productStatus("status").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
});

export type InsertProduct = typeof productTable.$inferInsert;
export type SelectProduct = typeof productTable.$inferSelect;

interface ModifiedFields {
  inventory: SQL | number;
}

type UpdateProductType = Partial<
  Omit<SelectProduct, "id" | "productCode" | "createdAt">
>;

export type UpdateProduct = Omit<UpdateProductType, keyof ModifiedFields> &
  ModifiedFields;
