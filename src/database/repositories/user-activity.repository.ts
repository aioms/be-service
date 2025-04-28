import { and, desc, sql } from "drizzle-orm";
import { singleton } from "tsyringe";
import { database } from "../../common/config/database.ts";
import {
  InsertUserActivity,
  userActivityTable,
} from "../schemas/user-activity.schema.ts";
import { PgTx } from "../custom/data-types.ts";

@singleton()
export class UserActivityRepository {
  async createActivity(data: InsertUserActivity, tx?: PgTx) {
    const db = tx || database;
    const result = await db.insert(userActivityTable).values(data).returning();
    return { data: result[0], error: null };
  }

  async getRecentActivities(userId: string, limit = 10, offset = 0) {
    const results = await database
      .select({
        id: userActivityTable.id,
        type: userActivityTable.type,
        description: userActivityTable.description,
        createdAt: userActivityTable.createdAt,
      })
      .from(userActivityTable)
      .where(sql`${userActivityTable.userId} = ${userId}`)
      .orderBy(desc(userActivityTable.createdAt))
      .limit(limit)
      .offset(offset);

    return { data: results, error: null };
  }

  async getActivitiesByDateRange(
    startDate: string,
    endDate: string,
    userId?: string
  ) {
    const whereClause = userId
      ? and(
          sql`${userActivityTable.createdAt}::date >= ${startDate}::date`,
          sql`${userActivityTable.createdAt}::date <= ${endDate}::date`,
          sql`${userActivityTable.userId} = ${userId}`
        )
      : and(
          sql`${userActivityTable.createdAt}::date >= ${startDate}::date`,
          sql`${userActivityTable.createdAt}::date <= ${endDate}::date`
        );

    const results = await database
      .select()
      .from(userActivityTable)
      .where(whereClause)
      .orderBy(desc(userActivityTable.createdAt));

    return { data: results, error: null };
  }
}
