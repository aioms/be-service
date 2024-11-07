import { SQL, eq, and, desc } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  InsertProduct,
  SelectProduct,
  UpdateProduct,
  productTable,
} from "../schemas/product.schema.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";

@singleton()
export class ProductRepository {
  /**
   * PRODUCT
   */
  async createProduct(data: InsertProduct) {
    const result = await database
      .insert(productTable)
      .values(data)
      .returning({ id: productTable.id });
    return { data: result, error: null };
  }

  async createProductOnConflictDoNothing(data: InsertProduct) {
    const result = await database
      .insert(productTable)
      .values(data)
      .onConflictDoNothing({ target: productTable.productCode })
      .returning({ id: productTable.id });
    return { data: result, error: null };
  }

  async createProductOnConflictDoUpdate(data: InsertProduct) {
    const result = await database
      .insert(productTable)
      .values(data)
      .onConflictDoUpdate({ target: productTable.productCode, set: data })
      .returning({ id: productTable.id });
    return { data: result, error: null };
  }

  async findProductById(
    id: SelectProduct["id"],
    opts: Pick<RepositoryOption, "select">,
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(productTable)
      .where(and(eq(productTable.id, id)));

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
      count = await database.$count(productTable);
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async updateProduct(opts: RepositoryOptionUpdate<UpdateProduct>) {
    const filters: SQL[] = [...opts.where];

    const result = await database
      .update(productTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: productTable.id });

    return { data: result, error: null };
  }

  async deleteProduct(id: SelectProduct["id"]) {
    const result = await database
      .delete(productTable)
      .where(eq(productTable.id, id))
      .returning({ id: productTable.id });

    return { data: result, error: null };
  }
}
