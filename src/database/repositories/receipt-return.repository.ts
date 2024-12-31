import { SQL, eq, and, desc } from "drizzle-orm";
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

@singleton()
export class ReceiptReturnRepository {
  /**
   * RECEIPT RETURN
   */
  async createReceiptReturn(data: InsertReceiptReturn) {
    const result = await database
      .insert(receiptReturnTable)
      .values(data)
      .returning({ id: receiptReturnTable.id });
    return { data: result, error: null };
  }

  async updateReceiptReturn(opts: RepositoryOptionUpdate<UpdateReceiptReturn>) {
    const filters: SQL[] = [...opts.where];

    const result = await database
      .update(receiptReturnTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptReturnTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptReturn(id: SelectReceiptReturn["id"]) {
    const result = await database
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
}
