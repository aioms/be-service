import { SQL, eq, and, desc, sql, sum } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";

import {
  InsertProduct,
  SelectProduct,
  UpdateProduct,
  productTable,
} from "../schemas/product.schema.ts";
import { productInventoryLogTable } from "../schemas/product-inventory-log.schema.ts";
import { productSupplierTable } from "../schemas/product-supplier.schema.ts";

import type {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import { PgTx } from "../custom/data-types.ts";
import { ProductWithSuppliers } from "../types/product.type.ts";

@singleton()
export class ProductRepository {
  /**
   * PRODUCT
   */
  async createProduct(data: InsertProduct, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(productTable)
      .values(data)
      .returning({ id: productTable.id });
    return { data: result, error: null };
  }

  createProductOnConflictDoNothing(data: InsertProduct[], tx?: PgTx) {
    const db = tx || database;
    return db
      .insert(productTable)
      .values(data)
      .onConflictDoNothing({ target: productTable.productCode })
      .returning({ id: productTable.id });
  }

  createProductOnConflictDoUpdate(data: InsertProduct[], tx?: PgTx) {
    const db = tx || database;
    return db
      .insert(productTable)
      .values(data)
      .onConflictDoUpdate({
        target: productTable.productCode,
        set: {
          category: sql`EXCLUDED.category`,
          description: sql`EXCLUDED.description`,
          imageUrls: sql`EXCLUDED.image_urls`,
          warehouse: sql`EXCLUDED.warehouse`,
          status: sql`EXCLUDED.status`,
        },
      })
      .returning({ id: productTable.id });
  }

  async findProductByIdentity(
    identity: string,
    opts: Pick<RepositoryOption, "select"> & { withSuppliers?: boolean },
    tx?: PgTx,
  ): Promise<{ data: ProductWithSuppliers; error: null }> {
    const isUUID = identity.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    const column = isUUID ? productTable.id : productTable.productCode;

    const query = tx || database
      .select(opts.select)
      .from(productTable);

    if (opts.withSuppliers) {
      query.leftJoin(
        productSupplierTable,
        eq(productSupplierTable.productId, productTable.id)
      );
    }

    query.where(eq(column, identity)).groupBy(productTable.id);

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findProductsByCondition(
    opts: RepositoryOption & { withSuppliers?: boolean }
  ): Promise<RepositoryResult<ProductWithSuppliers[]>> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database.select(opts.select).from(productTable);

    if (opts.withSuppliers) {
      query.leftJoin(
        productSupplierTable,
        eq(productSupplierTable.productId, productTable.id)
      );
    }

    query
      .where(and(...filters))
      .groupBy(productTable.id);

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(productTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(productTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results as ProductWithSuppliers[], error: null, count };
  }

  async updateProduct(
    opts: RepositoryOptionUpdate<Partial<UpdateProduct>>,
    tx?: PgTx
  ) {
    const db = tx || database;
    const filters: SQL[] = [...opts.where];

    const result = await db
      .update(productTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: productTable.id });

    return { data: result, error: null };
  }

  async deleteProduct(id: SelectProduct["id"], tx?: PgTx) {
    const db = tx || database;

    const [result] = await Promise.all([
      db.delete(productTable).where(eq(productTable.id, id)).returning({ id: productTable.id }),
      db.delete(productInventoryLogTable).where(eq(productInventoryLogTable.productId, id)),
    ])

    return { data: result, error: null };
  }

  async findCategoriesByCondition(opts: RepositoryOption) {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .selectDistinctOn([productTable.category], {
        category: productTable.category,
      })
      .from(productTable)
      .where(and(...filters))
      .orderBy(productTable.category);

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database
        .select({
          count: sql<number>`COUNT(DISTINCT ${productTable.category})`,
        })
        .from(productTable)
        .where(filters.length ? and(...filters) : undefined)
        .then((result) => Number(result[0].count));
    }

    const results = await query.execute();

    if (!results.length) {
      return { data: [], error: null, count };
    }

    const suppliers = results.map((r) => r.category);
    return { data: suppliers, error: null, count };
  }

  async findUnitByCondition(opts: RepositoryOption) {
    const filters: SQL[] = [...opts.where];

    const query = database
      .selectDistinctOn([productTable.unit], {
        unit: productTable.unit,
      })
      .from(productTable)
      .where(and(...filters))
      .orderBy(productTable.unit);

    const results = await query.execute();
    if (results.length) {
      const unit = results.map((r) => r.unit);
      return { data: unit, error: null };
    }

    return { data: results, error: null };
  }

  async getTotalProducts() {
    const count = await database.$count(productTable);
    return count;
  }

  async getTotalInventory() {
    const count = await database
      .select({ 
        value: sql<number>`ROUND(COALESCE(SUM(${productTable.inventory}), 0))` 
      })
      .from(productTable)
      .execute();

    if (!count.length) {
      return 0;
    }

    return +(count[0].value || 0);
  }

  async getTotalValueInventory() {
    const count = await database
      .select({
        value: sql<number>`coalesce(sum(${productTable.inventory} * ${productTable.costPrice}), 0)`,
      })
      .from(productTable)
      .execute();

    if (!count.length) {
      return 0;
    }

    return +(count[0].value || 0);
  }

  async getTotalProductInventoryByCategory(category: string) {
    const count = await database
      .select({ value: sum(productTable.inventory) })
      .from(productTable)
      .where(eq(productTable.category, category))
      .execute();

    if (!count.length) {
      return 0;
    }

    return +(count[0].value || 0);
  }

  async getInventoryByCategory(opts: {
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: { x: string; y: number }[];
    total: number;
  }> {
    const page = opts.page || 1;
    const limit = opts.limit || 10;
    const offset = (page - 1) * limit;
    const filters: SQL[] = [];

    // Add category filter if provided
    if (opts.category) {
      filters.push(eq(productTable.category, opts.category));
    }

    // Get total count for pagination
    const totalCount = await database.$count(
      productTable,
      filters.length ? and(...filters) : undefined
    );

    // Get product inventory data with pagination
    const query = database
      .select({
        productName: productTable.productName,
        inventory: productTable.inventory,
      })
      .from(productTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(productTable.inventory))
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Transform data into chart format
    const dataset = results.map((item) => ({
      x: item.productName,
      y: Number(item.inventory),
    }));

    return {
      data: dataset,
      total: totalCount,
    };
  }
}
