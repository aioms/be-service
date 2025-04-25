import { SQL, eq, and, desc, sql } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import {
  receiptItemTable,
  InsertReceiptItem,
  UpdateReceiptItem,
  SelectReceiptItem,
} from "../schemas/receipt-item.schema.ts";
import { PgTx } from "../custom/data-types.ts";
import { receiptImportTable } from "../schemas/receipt-import.schema.ts";
import { receiptReturnTable } from "../schemas/receipt-return.schema.ts";
import { receiptCheckTable } from "../schemas/receipt-check.schema.ts";

import { ReceiptImportStatus } from "../../modules/receipt/enums/receipt.enum.ts";

@singleton()
export class ReceiptItemRepository {
  /**
   * RECEIPT ITEM
   */
  async createReceiptItem(data: InsertReceiptItem[], tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(receiptItemTable)
      .values(data)
      .returning({
        id: receiptItemTable.id,
        inventory: receiptItemTable.inventory,
        quantity: receiptItemTable.quantity,
      });
    return { data: result, error: null };
  }

  async updateReceiptItem(
    opts: RepositoryOptionUpdate<Partial<UpdateReceiptItem>>,
    tx?: PgTx
  ) {
    const db = tx || database;
    const filters: SQL[] = [...opts.where];

    const result = await db
      .update(receiptItemTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptItemTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptItem(id: SelectReceiptItem["id"], tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .delete(receiptItemTable)
      .where(eq(receiptItemTable.id, id))
      .returning({ id: receiptItemTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptItemByReceiptId(
    receiptId: SelectReceiptItem["receiptId"],
    tx?: PgTx
  ) {
    const db = tx || database;
    const result = await db
      .delete(receiptItemTable)
      .where(eq(receiptItemTable.receiptId, receiptId))
      .returning({ id: receiptItemTable.id });

    return { data: result, error: null };
  }

  async findReceiptItemsByCondition(
    opts: RepositoryOption
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(receiptItemTable)
      .groupBy(receiptItemTable.id)
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(receiptItemTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(receiptItemTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async findReceiptItemsByProduct(
    type: string,
    opts: RepositoryOption
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database.select().from(receiptItemTable);

    let joinedTable: any;
    switch (type) {
      case "import":
        joinedTable = receiptImportTable;
        query.innerJoin(
          receiptImportTable,
          eq(receiptItemTable.receiptId, receiptImportTable.id)
        );
        break;
      case "return":
        joinedTable = receiptReturnTable;
        query.innerJoin(
          receiptReturnTable,
          eq(receiptItemTable.receiptId, receiptReturnTable.id)
        );
        break;
      case "check":
        joinedTable = receiptCheckTable;
        query.innerJoin(
          receiptCheckTable,
          eq(receiptItemTable.receiptId, receiptCheckTable.id)
        );
        break;
      default:
        break;
    }

    query.where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(receiptItemTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount && joinedTable) {
      const countQuery = database
        .select({ count: sql<number>`count(*)` })
        .from(receiptItemTable)
        .innerJoin(joinedTable, eq(receiptItemTable.receiptId, joinedTable.id))
        .where(and(...filters));

      const [result] = await countQuery.execute();
      count = +(result?.count ?? 0);
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async getImportProductsByDateRange(
    startDate: string,
    endDate: string,
    productId?: string,
  ): Promise<{ x: string; y: number }[]> {
    // Ensure dates are in correct format
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filters = [
      sql`${receiptItemTable.createdAt}::date >= ${start.toISOString()}::date`,
      sql`${receiptItemTable.createdAt}::date <= ${end.toISOString()}::date`,
      eq(receiptImportTable.status, ReceiptImportStatus.COMPLETED),
    ];

    if (productId) {
      filters.push(eq(receiptItemTable.productId, productId));
    }

    // Get daily total imported products
    const results = await database
      .select({
        date: sql<string>`DATE(${receiptItemTable.createdAt})`,
        totalQuantity: sql<number>`COALESCE(SUM(${receiptItemTable.quantity}), 0)`,
      })
      .from(receiptItemTable)
      .innerJoin(
        receiptImportTable,
        eq(receiptItemTable.receiptId, receiptImportTable.id)
      )
      .where(and(...filters))
      .groupBy(sql`DATE(${receiptItemTable.createdAt})`)
      .orderBy(sql`DATE(${receiptItemTable.createdAt})`);

    // Generate complete date range with zero values for missing dates
    const dataset: { x: string; y: number }[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dayData = results.find((r) => r.date === dateStr);

      dataset.push({
        x: dateStr,
        y: dayData ? Number(dayData.totalQuantity) : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dataset;
  }
}
