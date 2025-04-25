import { SQL, eq, and, desc, sql } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import { PgTx } from "../custom/data-types.ts";
import {
  InsertSupplier,
  SelectSupplier,
  supplierTable,
  UpdateSupplier,
} from "../schemas/supplier.schema.ts";

@singleton()
export class SupplierRepository {
  async createSupplier(data: InsertSupplier, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(supplierTable)
      .values(data)
      .returning({ id: supplierTable.id });

    return { data: result, error: null };
  }

  async updateSupplier(
    opts: RepositoryOptionUpdate<UpdateSupplier>,
    tx?: PgTx
  ) {
    const db = tx || database;
    const filters: SQL[] = [...opts.where];

    const result = await db
      .update(supplierTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: supplierTable.id });

    return { data: result, error: null };
  }

  async deleteSupplier(id: SelectSupplier["id"], tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .delete(supplierTable)
      .where(eq(supplierTable.id, id))
      .returning({ id: supplierTable.id });

    return { data: result, error: null };
  }

  async findSupplierByName(
    name: string,
    opts: Pick<RepositoryOption, "select">
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(supplierTable)
      .where(and(eq(supplierTable.name, name)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findSupplierById(
    id: SelectSupplier["id"],
    opts: Pick<RepositoryOption, "select">
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(supplierTable)
      .where(and(eq(supplierTable.id, id)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findSuppliersByCondition(
    opts: RepositoryOption
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(supplierTable)
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(supplierTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(supplierTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async createSupplierOnConflictDoNothing(data: InsertSupplier, tx?: PgTx) {
    const db = tx || database;
    const query = db
      .insert(supplierTable)
      .values(data)
      .returning({ id: supplierTable.id })
      .onConflictDoNothing({
        target: supplierTable.name,
      });

    const result = await query.execute();
    return { data: result, error: null };
  }

  async createSupplierOnConflictDoUpdate(data: InsertSupplier[], tx?: PgTx) {
    const db = tx || database;
    const query = db
      .insert(supplierTable)
      .values(data)
      .onConflictDoUpdate({
        target: supplierTable.name,
        set: {
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      })
      .returning({ id: supplierTable.id });

    const result = await query.execute();
    return { data: result, error: null };
  }
}
