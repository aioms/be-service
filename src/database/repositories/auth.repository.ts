import { eq, and, sql, SQL, isNull } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import { SelectUser, userTable } from "../schemas/user.schema.ts";
import { UserStatus } from "../../modules/auth/enums/user.enum.ts";
import { SelectUserRole, userRoleTable } from "../schemas/user-role.schema.ts";
import { roleTable } from "../schemas/role.schema.ts";

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
        sql`${userTable.username} = ${username} AND ${userTable.status} = ${UserStatus.active} AND ${userTable.deletedAt} IS NULL`,
      );

    const [result] = await query.execute();
    return result;
  }

  async findRolesOfUser(
    id: SelectUserRole["userId"],
  ): Promise<Record<string, any>[] | []> {
    const query = database
      .select()
      .from(userRoleTable)
      .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .where(eq(userRoleTable.userId, id));

    const results = await query.execute();
    return results;
  }

  updateTokenVersion(
    id: SelectUser["id"],
    tokenVersion: SelectUser["tokenVersion"],
  ) {
    return database
      .update(userTable)
      .set({
        tokenVersion,
      })
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning();
  }
}
