import { SQL, eq, and, desc } from "drizzle-orm";
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

@singleton()
export class ReceiptItemRepository {
  /**
   * RECEIPT ITEM
   */
  async createReceiptItem(data: InsertReceiptItem[]) {
    const result = await database
      .insert(receiptItemTable)
      .values(data)
      .returning({ id: receiptItemTable.id });
    return { data: result, error: null };
  }

  async updateReceiptItem(opts: RepositoryOptionUpdate<UpdateReceiptItem>) {
    const filters: SQL[] = [...opts.where];

    const result = await database
      .update(receiptItemTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptItemTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptItem(id: SelectReceiptItem["id"]) {
    const result = await database
      .delete(receiptItemTable)
      .where(eq(receiptItemTable.id, id))
      .returning({ id: receiptItemTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptItemByReceiptId(
    receiptId: SelectReceiptItem["receiptId"]
  ) {
    const result = await database
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
}
