import { SQL, eq, and, isNull, desc, notInArray } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import { InsertUser, SelectUser, userTable } from "../schemas/user.schema.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";
import { PgTx } from "../custom/data-types.ts";
import { UserRole } from "../enums/user.enum.ts";

@singleton()
export class UserRepository {
  /**
   * USER
   */
  async createUser(data: InsertUser, tx?: PgTx) {
    const db = tx || database;
    const result = await db
      .insert(userTable)
      .values(data)
      .returning({ id: userTable.id });

    return { data: result, error: null };
  }

  async findUserById(
    id: SelectUser["id"],
    opts: Pick<RepositoryOption, "select">,
  ): Promise<RepositoryResult> {
    const query = database
      .selectDistinct(opts.select)
      .from(userTable)
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  async findUsersByCondition(
    opts: RepositoryOption,
  ): Promise<RepositoryResult> {
    let count: number | null = null;
    const filters: SQL[] = [
      isNull(userTable.deletedAt),
      notInArray(userTable.role, [UserRole.DEVELOPER]),
      ...opts.where,
    ];

    const query = database
      .select(opts.select)
      .from(userTable)
      .where(and(...filters));

    if (opts.orderBy) {
      query.orderBy(...opts.orderBy);
    } else {
      query.orderBy(desc(userTable.createdAt));
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    if (opts.offset) {
      query.offset(opts.offset);
    }

    if (opts.isCount) {
      count = await database.$count(userTable);
    }

    const results = await query.execute();
    return { data: results, error: null, count };
  }

  async updateUser(
    opts: RepositoryOptionUpdate<
      Partial<Omit<SelectUser, "id" | "password" | "createdAt">>
    >,
    tx?: PgTx,
  ) {
    const db = tx || database;
    const filters: SQL[] = [
      isNull(userTable.deletedAt),
      notInArray(userTable.role, [UserRole.DEVELOPER, UserRole.ADMIN]),
      // not(eq(userTable.role, "supervisor")),
      ...opts.where,
    ];

    const result = await db
      .update(userTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: userTable.id });

    return { data: result, error: null };
  }
}
