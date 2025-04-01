import { SQL, eq, and, desc, sql, sum } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  InsertProduct,
  SelectProduct,
  UpdateProduct,
  productTable,
} from "../schemas/product.schema.ts";
import { supplierTable } from "../schemas/supplier.schema.ts";
import type {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import { PgTx } from "../custom/data-types.ts";

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
      .onConflictDoNothing({ target: productTable.productCode });
    // .returning({ id: productTable.id });
  }

  createProductOnConflictDoUpdate(data: InsertProduct[], tx?: PgTx) {
    const db = tx || database;
    return db
      .insert(productTable)
      .values(data)
      .onConflictDoUpdate({
        target: productTable.productCode,
        set: {
          index: sql`EXCLUDED.index`,
          productCode: sql`EXCLUDED.product_code`,
          productName: sql`EXCLUDED.product_name`,
          sellingPrice: sql`EXCLUDED.selling_price`,
          costPrice: sql`EXCLUDED.cost_price`,
          inventory: sql`EXCLUDED.inventory`,
          unit: sql`EXCLUDED.unit`,
          category: sql`EXCLUDED.category`,
          supplier: sql`EXCLUDED.supplier`,
          additionalDescription: sql`EXCLUDED.additional_description`,
          imageUrls: sql`EXCLUDED.image_urls`,
          warehouseLocation: sql`EXCLUDED.warehouse_location`,
          status: sql`EXCLUDED.status`,
        },
      });
    // .returning({ id: productTable.id });
  }

  async findProductByIdentity(
    identity: string,
    opts: Pick<RepositoryOption, "select">,
  ): Promise<RepositoryResult> {
    const isUUID = identity.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    const column = isUUID ? productTable.id : productTable.productCode;

    const query = database
      .selectDistinct(opts.select)
      .from(productTable)
      .leftJoin(supplierTable, eq(supplierTable.id, productTable.supplier))
      .where(and(eq(column, identity)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findProductsByCondition(
    opts: RepositoryOption,
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(productTable)
      .leftJoin(supplierTable, eq(supplierTable.id, productTable.supplier))
      .where(and(...filters));

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
    return { data: results, error: null, count };
  }

  async getLastIndex() {
    const lastIndexProduct = await database
      .select()
      .from(productTable)
      .orderBy(desc(productTable.index))
      .limit(1)
      .execute();

    if (!lastIndexProduct.length) {
      return { data: 0, error: null };
    }

    return { data: lastIndexProduct[0].index, error: null };
  }

  async updateProduct(
    opts: RepositoryOptionUpdate<Partial<UpdateProduct>>,
    tx?: PgTx,
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
    const result = await db
      .delete(productTable)
      .where(eq(productTable.id, id))
      .returning({ id: productTable.id });

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
      count = await database.$count(productTable, and(...filters));
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
      .select({ value: sum(productTable.inventory) })
      .from(productTable)
      .execute();

    if (!count.length) {
      return 0;
    }

    return +(count[0].value || 0);
  }
}
