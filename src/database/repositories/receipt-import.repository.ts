import { SQL, eq, and, desc } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import {
  receiptImportTable,
  InsertReceiptImport,
  UpdateReceiptImport,
  SelectReceiptImport,
} from "../schemas/receipt-import.schema.ts";

@singleton()
export class ReceiptImportRepository {
  /**
   * RECEIPT IMPORT
   */
  async createReceiptImport(data: InsertReceiptImport) {
    const result = await database
      .insert(receiptImportTable)
      .values(data)
      .returning({ id: receiptImportTable.id });
    return { data: result, error: null };
  }

  async updateReceiptImport(opts: RepositoryOptionUpdate<UpdateReceiptImport>) {
    const filters: SQL[] = [...opts.where];

    const result = await database
      .update(receiptImportTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: receiptImportTable.id });

    return { data: result, error: null };
  }

  async deleteReceiptImport(id: SelectReceiptImport["id"]) {
    const result = await database
      .delete(receiptImportTable)
      .where(eq(receiptImportTable.id, id))
      .returning({ id: receiptImportTable.id });

    return { data: result, error: null };
  }

  async findReceiptImportById(
    id: SelectReceiptImport["id"],
    opts: Pick<RepositoryOption, "select">
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(receiptImportTable)
      .where(and(eq(receiptImportTable.id, id)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findReceiptsImportByCondition(
    opts: RepositoryOption
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [...opts.where];

    const query = database
      .select(opts.select)
      .from(receiptImportTable)
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(receiptImportTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(receiptImportTable, and(...filters));
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }
}
