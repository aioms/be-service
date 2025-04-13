import { eq, and, sql, SQL, isNull } from "drizzle-orm";
import { singleton } from "tsyringe";

import { database } from "../../common/config/database.ts";
import { PgTx } from "../custom/data-types.ts";
import { UserStatus } from "../enums/user.enum.ts";

import { SelectUser, userTable } from "../schemas/user.schema.ts";

interface OptionBase {
  select: Record<string, any>;
  where: SQL<unknown>;
  orderBy?: SQL;
  limit?: number;
}

@singleton()
export class AuthRepository {
  async findUserByUsername(
    username: SelectUser["username"],
    opts: Pick<OptionBase, "select">,
  ): Promise<Record<string, any> | null> {
    const query = database
      .selectDistinct(opts.select)
      .from(userTable)
      .where(
        sql`${userTable.username} = ${username} AND ${userTable.status} = ${UserStatus.ACTIVE} AND ${userTable.deletedAt} IS NULL`,
      );

    const [result] = await query.execute();
    return result;
  }

  updateTokenVersion(
    id: SelectUser["id"],
    tokenVersion: SelectUser["tokenVersion"],
    tx?: PgTx,
  ) {
    const db = tx || database;
    return db
      .update(userTable)
      .set({
        tokenVersion,
      })
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
  }
}
