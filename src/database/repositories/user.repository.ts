import { eq, SQL } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  InsertUser,
  SelectUser,
  userTable,
} from "../../modules/auth/schemas/user.schema.ts";

interface OptionBase {
  select: Record<string, any>;
  where: SQL<unknown>;
  orderBy?: SQL;
  limit?: number;
}

interface OptionUpdateBase<T> {
  where: SQL<unknown>;
  set: T;
}

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
  createUser(data: InsertUser) {
    return database
      .insert(userTable)
      .values(data)
      .returning({ id: userTable.id });
  }

  async findUserById(
    id: SelectUser["id"],
    opts: Pick<OptionBase, "select">,
  ): Promise<Record<string, any> | null> {
    const query = database
      .selectDistinct(opts.select)
      .from(userTable)
      .where(eq(userTable.id, id));

    const [result] = await query.execute();
    return result;
  }

  async findUsersByCondition(
    opts: OptionBase,
  ): Promise<Record<string, any>[] | []> {
    const query = database
      .select(opts.select)
      .from(userTable)
      .where(opts.where);

    if (opts.orderBy) {
      query.orderBy(opts.orderBy);
    }

    if (opts.limit) {
      query.limit(opts.limit);
    }

    const results = await query.execute();
    return results;
  }

  updateUser(
    opts: OptionUpdateBase<
      Partial<Omit<SelectUser, "id" | "password" | "username" | "createdAt">>
    >,
  ) {
    return database.update(userTable).set(opts.set).where(opts.where);
  }

  deleteUser(id: SelectUser["id"]) {
    return database.delete(userTable).where(eq(userTable.id, id));
  }
}
