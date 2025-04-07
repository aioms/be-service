import { SQL, eq, and, desc, sql } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import {
  receiptReturnTable,
  InsertReceiptReturn,
  UpdateReceiptReturn,
  SelectReceiptReturn,
} from "../schemas/receipt-return.schema.ts";
import { supplierTable } from "../schemas/supplier.schema.ts";
import { PgTx } from "../custom/data-types.ts";
import { ReceiptReturnStatus } from "../../modules/product/enums/receipt.enum.ts";

@singleton()
export class ReceiptReturnRepository {
  /**
   * RECEIPT RETURN
   */
  async createReceiptReturn(data: InsertReceiptReturn, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(receiptReturnTable)
      .values(data)
      .returning({ id: receiptReturnTable.id });
    return { data: result, error: null };
  }

  async updateReceiptReturn(
    opts: RepositoryOptionUpdate<UpdateReceiptReturn>,
    tx?: PgTx
  ) {
    const db = tx || database;
    const filters: SQL[] = [...opts.where];

    const result = await db
      .update(receiptReturnTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptReturnTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptReturn(id: SelectReceiptReturn["id"], tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .delete(receiptReturnTable)
      .where(eq(receiptReturnTable.id, id))
      .returning({ id: receiptReturnTable.id });

    return { data: result, error: null };
  }

  async findReceiptReturnById(
    id: SelectReceiptReturn["id"],
    opts: Pick<RepositoryOption, "select">
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(receiptReturnTable)
      .leftJoin(
        supplierTable,
        eq(supplierTable.id, receiptReturnTable.supplier)
      )
      .where(and(eq(receiptReturnTable.id, id)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findReceiptsReturnByCondition(
    opts: RepositoryOption
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(receiptReturnTable)
      .leftJoin(
        supplierTable,
        eq(supplierTable.id, receiptReturnTable.supplier)
      )
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(receiptReturnTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(receiptReturnTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async findReceiptReturnByReceiptNumber(
    receiptNumber: SelectReceiptReturn["receiptNumber"],
    opts: Pick<RepositoryOption, "select">
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(receiptReturnTable)
      .leftJoin(
        supplierTable,
        eq(supplierTable.id, receiptReturnTable.supplier)
      )
      .where(and(eq(receiptReturnTable.receiptNumber, receiptNumber)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async getTotalOfReturn() {
    const query = database
      .select({
        total: sql<number>`coalesce(sum(${receiptReturnTable.totalProduct}), 0)`,
      })
      .from(receiptReturnTable)
      .where(eq(receiptReturnTable.status, ReceiptReturnStatus.COMPLETED));

    const [result] = await query.execute();
    return +(result?.total ?? 0);
  }

  async getTotalReturnsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ x: string; y: number }[]> {
    // Ensure dates are in correct format
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all returns within date range
    const results = await database
      .select({
        date: sql<string>`DATE(${receiptReturnTable.createdAt})`,
        total: sql<number>`COALESCE(SUM(${receiptReturnTable.totalProduct}), 0)`,
      })
      .from(receiptReturnTable)
      .where(
        and(
          sql`${
            receiptReturnTable.createdAt
          }::date >= ${start.toISOString()}::date`,
          sql`${
            receiptReturnTable.createdAt
          }::date <= ${end.toISOString()}::date`,
          eq(receiptReturnTable.status, ReceiptReturnStatus.COMPLETED)
        )
      )
      .groupBy(sql`DATE(${receiptReturnTable.createdAt})`)
      .orderBy(sql`DATE(${receiptReturnTable.createdAt})`);

    // Generate complete date range with zero values for missing dates
    const dataset: { x: string; y: number }[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = results.find((r) => r.date === dateStr);

      dataset.push({
        x: dateStr,
        y: dayData ? Number(dayData.total) : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataset;
  }
}
