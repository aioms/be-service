import { SQL, eq, and, desc } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import {
  InsertReceiptCheck,
  receiptCheckTable,
  SelectReceiptCheck,
  UpdateReceiptCheck,
} from "../schemas/receipt-check.schema.ts";
import { supplierTable } from "../schemas/supplier.schema.ts";
import { userTable } from "../schemas/user.schema.ts";
import { receiptItemTable } from "../schemas/receipt-item.schema.ts";

import { PgTx } from "../custom/data-types.ts";

@singleton()
export class ReceiptCheckRepository {
  /**
   * RECEIPT CHECK
   */
  async createReceiptCheck(data: InsertReceiptCheck, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(receiptCheckTable)
      .values(data)
      .returning({ id: receiptCheckTable.id });
    return { data: result, error: null };
  }

  async updateReceiptCheck(opts: RepositoryOptionUpdate<UpdateReceiptCheck>, tx?: PgTx) {
    const db = tx || database;
    const filters: SQL[] = [...opts.where];

    const result = await db
      .update(receiptCheckTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptCheckTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptCheck(id: SelectReceiptCheck["id"], tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .delete(receiptCheckTable)
      .where(eq(receiptCheckTable.id, id))
      .returning({ id: receiptCheckTable.id });

    return { data: result, error: null };
  }

  async findReceiptCheckById(
    id: SelectReceiptCheck["id"],
    opts: Pick<RepositoryOption, "select">,
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(receiptCheckTable)
      .leftJoin(supplierTable, eq(supplierTable.id, receiptCheckTable.supplier))
      .where(and(eq(receiptCheckTable.id, id)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findReceiptCheckByReceiptNumber(
    receiptNumber: SelectReceiptCheck["receiptNumber"],
    opts: Pick<RepositoryOption, "select">,
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(receiptCheckTable)
      .leftJoin(supplierTable, eq(supplierTable.id, receiptCheckTable.supplier))
      .where(and(eq(receiptCheckTable.receiptNumber, receiptNumber)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findReceiptsCheckByCondition(
    opts: RepositoryOption,
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(receiptCheckTable)
      .leftJoin(supplierTable, eq(supplierTable.id, receiptCheckTable.supplier))
      .leftJoin(userTable, eq(userTable.id, receiptCheckTable.checker))
      .leftJoin(
        receiptItemTable,
        eq(receiptCheckTable.id, receiptItemTable.receiptId),
      )
      .groupBy(receiptCheckTable.id, userTable.id, supplierTable.id)
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(receiptCheckTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(receiptCheckTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }
}
