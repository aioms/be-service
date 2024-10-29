import { SQL, eq, and, isNull, desc } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import { InsertUser, SelectUser, userTable } from "../schemas/user.schema.ts";
import { roleTable, SelectRole } from "../schemas/role.schema.ts";
import {
  InsertUserRole,
  SelectUserRole,
  userRoleTable,
} from "../schemas/user-role.schema.ts";
import {
  RepositoryOption,
  RepositoryOptionUpdate,
  RepositoryResult,
} from "../../common/types/index.d.ts";

// export interface IUserRepository {
//   createUser(data: InsertUser): Promise<any>;
//   findUserById(
//     id: SelectUser["id"],
//     opts: Pick<OptionBase, "select">,
//   ): Promise<Record<string, any> | null>;
//   findUsersByCondition(opts: OptionBase): Promise<Record<string, any>[] | []>;
//   updateUser(
//     opts: OptionUpdateBase<
//       Partial<Omit<SelectUser, "id" | "password" | "username" | "createdAt">>
//     >,
//   ): Promise<any>;
//   deleteUser(id: SelectUser["id"]): Promise<any>;
// }

@singleton()
export class UserRepository {
  /**
   * USER
   */
  async createUser(data: InsertUser) {
    const result = await database
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
    const filters: SQL[] = [isNull(userTable.deletedAt), ...opts.where];

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
  ) {
    const filters: SQL[] = [isNull(userTable.deletedAt), ...opts.where];

    const result = await database
      .update(userTable)
      .set(opts.set)
      .where(and(...filters))
      .returning({ id: userTable.id });

    return { data: result, error: null };
  }

  async deleteUser(id: SelectUser["id"]) {
    const result = await database.delete(userTable).where(eq(userTable.id, id));
    return { data: result, error: null };
  }

  /**
   * ROLES & PERMISSION
   */
  async findRoleByName(name: SelectRole["name"]): Promise<RepositoryResult> {
    const query = database
      .selectDistinct()
      .from(roleTable)
      .where(eq(roleTable.name, name));

    const [result] = await query.execute();
    return { data: result, error: null };
  }

  createUserRole(data: InsertUserRole) {
    return database.insert(userRoleTable).values(data);
  }

  deleteUserRoles(userId: SelectUserRole["userId"]) {
    return database
      .delete(userRoleTable)
      .where(eq(userRoleTable.userId, userId));
  }
}
